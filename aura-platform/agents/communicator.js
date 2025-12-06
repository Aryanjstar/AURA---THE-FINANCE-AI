/**
 * Communicator Agent - User Communication & Engagement
 * Translates complex analysis into clear, actionable insights
 * 
 * OpenAI x NxtWave Buildathon
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { openaiService } from "../services/openai-service.js";
import { logger } from "../services/logger.js";
import dotenv from "dotenv";

dotenv.config();

export class CommunicatorAgent {
	constructor() {
        this.name = "Communicator";
        this.icon = "💬";
        this.model = null;
		this.genAI = null;
        this.useOpenAI = openaiService.isAvailable();
        
        if (!this.useOpenAI && process.env.GEMINI_API_KEY) {
			this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        
        logger.agent('COMMUNICATOR', `Initialized (Using ${this.useOpenAI ? 'OpenAI' : 'Gemini'})`);
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
            logger.agent('COMMUNICATOR', 'Generating user-friendly response...');

            const systemPrompt = `You are an expert Financial Communicator AI for Indian users.

CRITICAL: Never start with "Hey", "Hello", "Hi there". Start DIRECTLY with the answer.

Your role:
1. Explain financial concepts in simple language
2. Use Indian context (SIP, ELSS, PPF, NPS, ₹)
3. Be helpful and realistic
4. Give actionable takeaways

FORMAT:
- Start directly with the content (no greetings)
- Use **bold** for headers
- Use bullet points for lists
- Include specific numbers
- End with ONE follow-up question`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ], { temperature: 0.7 });
                
                logger.success('COMMUNICATOR response generated via OpenAI');
                return response;
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(`${systemPrompt}\n\nQuery: ${prompt}`);
                logger.success('COMMUNICATOR response generated via Gemini');
                return result.response.text();
            }

            return this._getFallbackResponse(prompt);
		} catch (error) {
            logger.error('COMMUNICATOR error', error);
            return this._getFallbackResponse(prompt);
        }
    }

    async generateUserCommunication(quantAnalysis, strategy, actionPlan, userProfile) {
        try {
            logger.agent('COMMUNICATOR', 'Creating personalized communication...');

            const netWorth = quantAnalysis?.metrics?.netWorth?.value || 0;
            const portfolioReturn = quantAnalysis?.metrics?.portfolioReturn?.value || 0;

            const prompt = `Create a personalized, engaging financial summary for this user:

USER PROFILE:
- Risk Profile: ${userProfile?.riskTolerance || 'Moderate'}
- Net Worth: ₹${(netWorth / 100000).toFixed(2)}L
- Portfolio Return: ${portfolioReturn.toFixed(2)}%

KEY INSIGHTS:
${quantAnalysis?.insights?.slice(0, 3).join('\n') || 'Portfolio analysis complete'}

STRATEGY HIGHLIGHTS:
${strategy?.recommendations?.slice(0, 3).join('\n') || 'Diversified investment approach'}

TOP ACTIONS:
${actionPlan?.immediateActions?.slice(0, 3).map(a => a.action).join('\n') || 'Review investments'}

Create:
1. EXECUTIVE SUMMARY (2-3 sentences, positive but realistic)
2. KEY INSIGHTS (3 bullet points with emojis)
3. ACTION PRIORITIES (3 prioritized actions)
4. MOTIVATIONAL CLOSING (1-2 sentences)

Make it personal, warm, and actionable. Use Indian financial context.`;

            let communicationText = '';

            if (this.useOpenAI) {
                communicationText = await openaiService.chat([
                    { role: 'system', content: 'You are a warm, expert financial advisor creating personalized communications.' },
                    { role: 'user', content: prompt }
                ], { temperature: 0.7, maxTokens: 1000 });
            } else {
                await this._initializeModel();
                if (this.model) {
                    const result = await this.model.generateContent(prompt);
                    communicationText = result.response.text();
                }
            }

            const communication = this.parseAndStructureCommunication(communicationText, quantAnalysis, strategy, actionPlan, userProfile);
            
            logger.success('COMMUNICATOR: Personalized message created');
            return communication;

		} catch (error) {
            logger.error('Communication generation error', error);
            return this._getDefaultCommunication(quantAnalysis, strategy, actionPlan, userProfile);
        }
    }

    parseAndStructureCommunication(text, quantAnalysis, strategy, actionPlan, userProfile) {
        const netWorth = quantAnalysis?.metrics?.netWorth?.value || 0;
        const portfolioReturn = quantAnalysis?.metrics?.portfolioReturn?.value || 0;

        // Generate structured communication
        return {
            executiveSummary: this.extractSection(text, 'summary') || 
                `Your portfolio of ₹${(netWorth / 100000).toFixed(1)}L shows ${portfolioReturn > 10 ? 'strong' : 'steady'} performance with ${portfolioReturn.toFixed(1)}% returns. ${portfolioReturn > 12 ? 'You\'re outperforming the market!' : 'There\'s room to optimize your returns with some strategic adjustments.'}`,
            
            keyInsights: this.extractInsights(text, quantAnalysis),
            
            actionPriorities: this.extractPriorities(text, actionPlan),
            
            motivationalClosing: this.extractSection(text, 'closing') ||
                `Every small step counts towards your financial goals. You're making smart choices by reviewing your portfolio - that's what successful investors do! 🌟`,
            
            communicationType: 'portfolio_review',
            deliveryMethod: this.selectDeliveryMethod(userProfile),
            urgency: this.assessUrgency(quantAnalysis, actionPlan),
            followUpSchedule: this.scheduleFollowUps(),
            
            fullMessage: text || this.createDefaultMessage(quantAnalysis, strategy, actionPlan),
            timestamp: new Date().toISOString()
        };
    }

    extractSection(text, sectionType) {
        const lines = text.split('\n');
        const keywords = {
            summary: ['summary', 'executive', 'overview'],
            closing: ['closing', 'motivation', 'remember', 'keep']
        };

        const sectionKeywords = keywords[sectionType] || [];
        let inSection = false;
        let sectionLines = [];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            if (sectionKeywords.some(kw => lowerLine.includes(kw))) {
                inSection = true;
                continue;
            }
            
            if (inSection) {
                if (line.match(/^[A-Z#\*]/) && sectionLines.length > 0) {
                    break;
                }
                if (line.trim().length > 0) {
                    sectionLines.push(line.trim());
                }
            }
        }

        return sectionLines.join(' ').trim() || null;
    }

    extractInsights(text, quantAnalysis) {
        const defaultInsights = [
            {
                emoji: '📊',
                insight: `Portfolio Return: ${(quantAnalysis?.metrics?.portfolioReturn?.value || 0).toFixed(1)}%`,
                context: quantAnalysis?.metrics?.portfolioReturn?.value > 12 ? 
                    'Beating the Nifty 50 benchmark!' : 'Consider rebalancing for better returns'
            },
            {
                emoji: '💰',
                insight: `Net Worth: ${quantAnalysis?.metrics?.netWorth?.formatted || '₹0'}`,
                context: 'Your wealth is growing - stay consistent!'
            },
            {
                emoji: '⚖️',
                insight: `Risk Profile: ${quantAnalysis?.metrics?.volatility?.category || 'Moderate'}`,
                context: 'Your portfolio volatility is aligned with your goals'
            }
        ];

        // Try to extract from AI response
        const extractedInsights = [];
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.match(/^[•\-✅📊💰⚖️🎯📈]/)) {
                extractedInsights.push({
                    emoji: line.match(/^[•\-✅📊💰⚖️🎯📈]/)?.[0] || '•',
                    insight: line.replace(/^[•\-✅📊💰⚖️🎯📈]\s*/, '').trim(),
                    context: ''
					});
				}
			}

        return extractedInsights.length >= 3 ? extractedInsights.slice(0, 4) : defaultInsights;
    }

    extractPriorities(text, actionPlan) {
        const defaultPriorities = [
            {
                priority: 1,
                action: actionPlan?.immediateActions?.[0]?.action || 'Review and rebalance portfolio',
                urgency: 'High',
                timeframe: 'This week'
            },
            {
                priority: 2,
                action: actionPlan?.immediateActions?.[1]?.action || 'Ensure adequate emergency fund',
                urgency: 'High',
                timeframe: 'This month'
            },
            {
                priority: 3,
                action: actionPlan?.shortTermActions?.[0]?.action || 'Review insurance coverage',
                urgency: 'Medium',
                timeframe: 'This month'
            }
        ];

        return defaultPriorities;
    }

    selectDeliveryMethod(userProfile) {
			return {
            primary: 'in_app',
            secondary: 'email',
            preferences: {
                frequency: 'weekly',
                detailed_reports: 'monthly',
                alerts: 'immediate'
            }
        };
    }

    assessUrgency(quantAnalysis, actionPlan) {
        let urgencyScore = 0;

        // Check for critical issues
        if (quantAnalysis?.metrics?.portfolioReturn?.value < 0) {
            urgencyScore += 30;
        }

        if (quantAnalysis?.metrics?.debtToIncome?.value > 0.5) {
            urgencyScore += 20;
        }

        if (actionPlan?.immediateActions?.some(a => a.priority === 'Critical')) {
            urgencyScore += 20;
        }

        if (urgencyScore > 40) return 'high';
        if (urgencyScore > 20) return 'medium';
        return 'low';
    }

    scheduleFollowUps() {
        const now = new Date();
        
        return [
            {
                type: 'weekly_check',
                date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                message: 'Quick portfolio health check'
            },
            {
                type: 'monthly_review',
                date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                message: 'Monthly investment review'
            },
            {
                type: 'quarterly_rebalance',
                date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                message: 'Quarterly portfolio rebalancing'
            }
        ];
    }

    createDefaultMessage(quantAnalysis, strategy, actionPlan) {
        const netWorth = quantAnalysis?.metrics?.netWorth?.formatted || '₹0';
        const portfolioReturn = quantAnalysis?.metrics?.portfolioReturn?.formatted || '0%';

        return `
## 📊 Your Financial Snapshot

**Net Worth:** ${netWorth}
**Portfolio Return:** ${portfolioReturn}

### Key Highlights
✅ Your investments are being tracked and analyzed
✅ Regular SIP investments compound over time
✅ Diversification helps manage risk

### Top Priorities
1. ${actionPlan?.immediateActions?.[0]?.action || 'Review current portfolio allocation'}
2. ${actionPlan?.immediateActions?.[1]?.action || 'Ensure adequate emergency fund'}
3. ${actionPlan?.shortTermActions?.[0]?.action || 'Consider tax-saving investments'}

### 💡 Remember
Small, consistent actions lead to big financial wins. Your journey to wealth creation is on track! 🚀
        `.trim();
    }

    _getDefaultCommunication(quantAnalysis, strategy, actionPlan, userProfile) {
		return {
            executiveSummary: 'Your portfolio analysis is complete. Here are personalized insights to help you reach your financial goals faster.',
            keyInsights: [
                { emoji: '📊', insight: 'Portfolio analyzed successfully', context: 'Regular reviews help optimize returns' },
                { emoji: '💰', insight: 'Investment tracking active', context: 'Stay consistent with your SIPs' },
                { emoji: '🎯', insight: 'Goals on track', context: 'Small steps lead to big achievements' }
            ],
            actionPriorities: [
                { priority: 1, action: 'Review portfolio allocation', urgency: 'High', timeframe: 'This week' },
                { priority: 2, action: 'Check emergency fund status', urgency: 'Medium', timeframe: 'This month' },
                { priority: 3, action: 'Plan tax-saving investments', urgency: 'Medium', timeframe: 'Before March' }
            ],
            motivationalClosing: 'You\'re taking the right steps by reviewing your finances. Keep going - your future self will thank you! 🌟',
            communicationType: 'portfolio_review',
            deliveryMethod: { primary: 'in_app', secondary: 'email' },
            urgency: 'low',
            followUpSchedule: this.scheduleFollowUps(),
            fullMessage: this.createDefaultMessage(quantAnalysis, strategy, actionPlan),
            timestamp: new Date().toISOString()
        };
    }

    _getFallbackResponse(prompt) {
        logger.warn('COMMUNICATOR using fallback response');

        return `I understand you'd like some financial guidance! 🌟

Here's what I can help you with:

💰 **Investment Guidance**
- SIP recommendations based on your goals
- Portfolio review and optimization
- Tax-saving investment strategies

📊 **Financial Planning**
- Goal-based planning (retirement, education, home)
- Emergency fund planning
- Insurance coverage review

📈 **Market Insights**
- Current market trends
- Sector opportunities
- Risk assessment

**Quick Tips for Indian Investors:**
1. Start with index funds if you're new to investing
2. Maximize 80C deductions with ELSS
3. Keep 6 months expenses as emergency fund
4. Insurance first, then investments

What specific area would you like to explore? I'm here to help you make informed financial decisions! 💪`;
    }
}

export default CommunicatorAgent;
