/**
 * Strategist Agent - Financial Planning & Strategy
 * Uses OpenAI GPT-4.1 with fallback to Gemini
 * 
 * OpenAI x NxtWave Buildathon
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { openaiService } from "../services/openai-service.js";
import { ragService } from "../services/rag-service.js";
import { logger } from "../services/logger.js";
import dotenv from "dotenv";

dotenv.config();

export class StrategistAgent {
    constructor() {
        this.name = "Strategist";
        this.icon = "🎯";
        this.model = null;
        this.genAI = null;
        this.useOpenAI = openaiService.isAvailable();
        
        if (!this.useOpenAI && process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        
        logger.agent('STRATEGIST', `Initialized (Using ${this.useOpenAI ? 'OpenAI' : 'Gemini'})`);
    }

    async _initializeModel() {
        if (!this.model && this.genAI) {
            this.model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    maxOutputTokens: 2048,
                },
            });
        }
    }

    async generateResponse(prompt) {
        try {
            logger.agent('STRATEGIST', 'Generating strategic response...');

            // Get RAG context
            const ragContext = await ragService.getContextForQuery(prompt);

            const systemPrompt = `You are a world-class Financial Strategist AI for Indian investors.

CRITICAL: Never start with greetings like "Hey", "Hello", "Hi". Start directly with the answer.

Your expertise: Financial planning, Indian tax (80C, 80D), Mutual funds, Portfolio allocation, NPS/PPF/EPF, Insurance.

KNOWLEDGE BASE:
${ragContext}

FORMAT RULES:
- Start DIRECTLY with answer or brief context (no greetings)
- Use **bold** for section headers
- Use bullet points for lists
- Keep response scannable and actionable
- Use ₹ for currency
- Be specific with numbers and recommendations
- End with ONE follow-up question`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ], { temperature: 0.7 });
                
                logger.success('STRATEGIST response generated via OpenAI');
                return response;
            }

            // Fallback to Gemini
            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(`${systemPrompt}\n\nUser Query: ${prompt}`);
                const response = result.response.text();
                logger.success('STRATEGIST response generated via Gemini');
                return response;
            }

            return this._getFallbackResponse(prompt);
        } catch (error) {
            logger.error('STRATEGIST error', error);
            return this._getFallbackResponse(prompt);
        }
    }

    async generatePersonalizedPlan(userProfile, financialData, goals) {
        try {
            logger.agent('STRATEGIST', 'Creating personalized financial plan...');

            const ragContext = await ragService.getContextForQuery(
                `financial planning for ${goals?.[0] || 'wealth creation'}`
            );

            const prompt = `Create a comprehensive, personalized financial plan for this user:

USER PROFILE:
- Age: ${userProfile?.age || 30}
- Risk Tolerance: ${userProfile?.riskTolerance || 'Moderate'}
- Monthly Income: ₹${userProfile?.monthlyIncome || 75000}
- Monthly Expenses: ₹${userProfile?.monthlyExpenses || 45000}

CURRENT FINANCIAL POSITION:
${JSON.stringify(financialData, null, 2)}

FINANCIAL GOALS:
${goals?.map((g, i) => `${i + 1}. ${g}`).join('\n') || '1. Wealth Creation\n2. Retirement Planning'}

FINANCIAL KNOWLEDGE:
${ragContext}

Provide a detailed plan with:
1. Executive Summary (2-3 sentences)
2. Asset Allocation Strategy (with percentages)
3. Specific Investment Recommendations (fund names/categories)
4. Tax Optimization Strategies (80C, 80D, NPS)
5. Monthly SIP Recommendations
6. Risk Management (insurance, emergency fund)
7. Timeline and Milestones
8. Key Metrics to Track`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: 'You are an expert Indian financial planner. Provide specific, actionable advice.' },
                    { role: 'user', content: prompt }
                ], { temperature: 0.7, maxTokens: 2000 });
                
                return this._parseStrategyResponse(response);
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(prompt);
                return this._parseStrategyResponse(result.response.text());
            }

            return this._getDefaultPlan(userProfile, financialData);
        } catch (error) {
            logger.error('STRATEGIST plan generation error', error);
            return this._getDefaultPlan(userProfile, financialData);
        }
    }

    _parseStrategyResponse(response) {
        return {
            summary: response,
            assetAllocation: this._extractAssetAllocation(response),
            recommendations: this._extractRecommendations(response),
            taxStrategies: this._extractTaxStrategies(response),
            timeline: this._extractTimeline(response),
            confidence: 0.85
        };
    }

    _extractAssetAllocation(text) {
        // Extract percentage allocations from response
        const allocations = {
            equity: 50,
            debt: 30,
            gold: 10,
            cash: 10
        };

        const patterns = {
            equity: /equity[:\s]*(\d+)%/i,
            debt: /debt[:\s]*(\d+)%/i,
            gold: /gold[:\s]*(\d+)%/i,
            cash: /cash|liquid[:\s]*(\d+)%/i
        };

        for (const [key, pattern] of Object.entries(patterns)) {
            const match = text.match(pattern);
            if (match) allocations[key] = parseInt(match[1]);
        }

        return allocations;
    }

    _extractRecommendations(text) {
        const recommendations = [];
        
        // Common fund patterns
        const fundPatterns = [
            /(?:invest in|recommend|consider)\s+([A-Z][a-zA-Z\s]+(?:Fund|ETF|Index))/gi,
            /SIP\s+(?:in|of)\s+(?:₹?[\d,]+\s+in\s+)?([A-Z][a-zA-Z\s]+Fund)/gi
        ];

        for (const pattern of fundPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (!recommendations.includes(match[1].trim())) {
                    recommendations.push(match[1].trim());
                }
            }
        }

        if (recommendations.length === 0) {
            return [
                'Large Cap Index Fund (Nifty 50)',
                'Flexi Cap Fund',
                'Short Duration Debt Fund',
                'Sovereign Gold Bonds'
            ];
        }

        return recommendations.slice(0, 5);
    }

    _extractTaxStrategies(text) {
        const strategies = [];
        
        if (text.toLowerCase().includes('80c') || text.toLowerCase().includes('elss')) {
            strategies.push('ELSS investment for 80C benefit (up to ₹1.5L)');
        }
        if (text.toLowerCase().includes('80d') || text.toLowerCase().includes('health insurance')) {
            strategies.push('Health insurance premium under 80D');
        }
        if (text.toLowerCase().includes('nps') || text.toLowerCase().includes('80ccd')) {
            strategies.push('NPS contribution for additional 80CCD(1B) benefit');
        }
        if (text.toLowerCase().includes('hra')) {
            strategies.push('HRA exemption optimization');
        }

        if (strategies.length === 0) {
            return [
                'Maximize 80C through ELSS (₹1.5L limit)',
                'Health insurance under 80D (₹25K-50K)',
                'NPS for additional ₹50K deduction under 80CCD(1B)'
            ];
        }

        return strategies;
    }

    _extractTimeline(text) {
        return {
            immediate: ['Emergency fund setup', 'Term insurance'],
            shortTerm: ['Start SIPs', 'Tax-saving investments'],
            mediumTerm: ['Portfolio rebalancing', 'Goal-specific investments'],
            longTerm: ['Retirement corpus building', 'Estate planning']
        };
    }

    async optimizeStrategy(currentStrategy, constraints, marketConditions) {
        try {
            logger.agent('STRATEGIST', 'Optimizing strategy based on market conditions...');

            const prompt = `Optimize this investment strategy based on current conditions:

CURRENT STRATEGY:
${JSON.stringify(currentStrategy, null, 2)}

CONSTRAINTS:
${constraints?.map(c => `- ${c}`).join('\n') || '- Standard risk tolerance'}

MARKET CONDITIONS:
${JSON.stringify(marketConditions, null, 2)}

Provide:
1. Recommended adjustments
2. Rebalancing suggestions
3. Tactical moves for current market
4. Risk mitigation steps`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: 'You are an expert portfolio manager.' },
                    { role: 'user', content: prompt }
                ]);
                
                return {
                    optimizedStrategy: response,
                    adjustments: this._extractAdjustments(response),
                    confidence: 0.8
                };
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(prompt);
                return {
                    optimizedStrategy: result.response.text(),
                    adjustments: [],
                    confidence: 0.75
                };
            }

            return { optimizedStrategy: currentStrategy, adjustments: [], confidence: 0.5 };
        } catch (error) {
            logger.error('Strategy optimization error', error);
            return { optimizedStrategy: currentStrategy, adjustments: [], confidence: 0.5 };
        }
    }

    _extractAdjustments(text) {
        const adjustments = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.match(/^\d+\.|^-|^•/) && line.length > 10) {
                adjustments.push(line.replace(/^\d+\.|^-|^•/, '').trim());
            }
        }
        
        return adjustments.slice(0, 5);
    }

    async collaborateWithAgents(quantAnalysis, realistData, doerPlan) {
        try {
            logger.agent('STRATEGIST', 'Synthesizing insights from other agents...');

            const prompt = `Synthesize these agent analyses into a cohesive strategy:

QUANTITATIVE ANALYSIS:
${JSON.stringify(quantAnalysis?.metrics || {}, null, 2)}

MARKET REALITY:
${JSON.stringify(realistData?.summary || 'Market data unavailable', null, 2)}

ACTION PLAN:
${JSON.stringify(doerPlan?.immediateActions || [], null, 2)}

Provide:
1. Unified strategic view
2. Priority actions combining all insights
3. Risk-adjusted recommendations
4. Confidence level for each recommendation`;

            if (this.useOpenAI) {
                return await openaiService.chat([
                    { role: 'system', content: 'You are a strategic synthesizer combining multiple AI agent insights.' },
                    { role: 'user', content: prompt }
                ]);
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(prompt);
                return result.response.text();
            }

            return 'Strategic synthesis requires active AI model connection.';
        } catch (error) {
            logger.error('Agent collaboration error', error);
            return 'Unable to synthesize agent insights at this time.';
        }
    }

    _getDefaultPlan(userProfile, financialData) {
        const monthlyInvestable = (userProfile?.monthlyIncome || 75000) - (userProfile?.monthlyExpenses || 45000);
        
        return {
            summary: `Based on your profile, we recommend a balanced approach to wealth creation with monthly investments of ₹${monthlyInvestable.toLocaleString('en-IN')}.`,
            assetAllocation: {
                equity: 60,
                debt: 25,
                gold: 10,
                cash: 5
            },
            recommendations: [
                'Nifty 50 Index Fund - 40% of equity',
                'Flexi Cap Fund - 30% of equity',
                'Mid Cap Fund - 30% of equity',
                'Short Duration Debt Fund - 100% of debt',
                'Sovereign Gold Bonds - 100% of gold allocation'
            ],
            taxStrategies: [
                'Invest ₹1.5L in ELSS for 80C',
                'Health insurance premium up to ₹50,000 under 80D',
                'Consider NPS for additional ₹50,000 deduction'
            ],
            timeline: {
                immediate: ['Set up emergency fund (3-6 months expenses)', 'Get term insurance'],
                shortTerm: ['Start SIPs in recommended funds', 'Complete tax-saving investments'],
                mediumTerm: ['Review and rebalance portfolio quarterly'],
                longTerm: ['Increase equity allocation as wealth grows']
            },
            confidence: 0.7
        };
    }

    _getFallbackResponse(prompt) {
        logger.warn('STRATEGIST using fallback response');
        
        if (prompt.toLowerCase().includes('sip') || prompt.toLowerCase().includes('invest')) {
            return `For systematic investing in India, I recommend:

1. **Start with Index Funds**: Nifty 50 Index funds offer low-cost market exposure with ~12-15% historical CAGR.

2. **Diversify with Flexi Cap**: These funds can invest across market caps based on opportunities.

3. **Monthly SIP Amount**: Based on the 50-30-20 rule, invest at least 20% of your income.

4. **Tax Efficiency**: Consider ELSS funds for 80C benefits - they have a 3-year lock-in but offer potential for higher returns.

5. **Debt Component**: Add short-duration debt funds for stability (15-20% of portfolio).

Would you like specific fund recommendations based on your risk profile?`;
        }

        return `As your financial strategist, I can help you with:

📊 **Investment Planning**
- Goal-based portfolio construction
- SIP recommendations for wealth creation
- Tax-efficient investing strategies

💰 **Tax Optimization**
- Section 80C investments (ELSS, PPF, NPS)
- Capital gains tax planning
- HRA and other deductions

🛡️ **Risk Management**
- Asset allocation based on your risk profile
- Insurance planning
- Emergency fund strategy

What specific area would you like to explore?`;
    }
}

export default StrategistAgent;
