/**
 * Doer Agent - Action Planning & Implementation
 * Converts strategies into actionable steps with timelines
 * 
 * OpenAI x NxtWave Buildathon
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { openaiService } from "../services/openai-service.js";
import { logger } from "../services/logger.js";
import dotenv from "dotenv";

dotenv.config();

export class DoerAgent {
	constructor() {
        this.name = "Doer";
        this.icon = "⚡";
        this.model = null;
		this.genAI = null;
        this.useOpenAI = openaiService.isAvailable();
        
        if (!this.useOpenAI && process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        
        logger.agent('DOER', `Initialized (Using ${this.useOpenAI ? 'OpenAI' : 'Gemini'})`);
    }

    async _initializeModel() {
        if (!this.model && this.genAI) {
			this.model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                generationConfig: {
                    temperature: 0.4,
                    topP: 0.85,
                    maxOutputTokens: 2048,
                },
            });
        }
    }

    async generateResponse(prompt) {
        try {
            logger.agent('DOER', 'Creating action plan...');

            const systemPrompt = `You are an Action-Oriented Financial Doer AI for Indian investors.

Your role:
1. Convert financial strategies into specific, actionable steps
2. Provide clear implementation guides with platforms/tools
3. Set realistic timelines for each action
4. Include verification steps to track progress
5. Prioritize actions by impact and urgency

For each recommendation, specify:
- Exact platform (Zerodha, Groww, Kuvera, etc.)
- Required documents
- Estimated time to complete
- Success metrics

Focus on Indian financial context (SIPs, ELSS, PPF, NPS, etc.)`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ], { temperature: 0.4 });
                
                logger.success('DOER response generated via OpenAI');
                return response;
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(`${systemPrompt}\n\nQuery: ${prompt}`);
                logger.success('DOER response generated via Gemini');
                return result.response.text();
            }

            return this._getFallbackResponse(prompt);
		} catch (error) {
            logger.error('DOER error', error);
            return this._getFallbackResponse(prompt);
        }
    }

    async createActionPlan(strategy, quantAnalysis, financialData) {
        try {
            logger.agent('DOER', 'Creating comprehensive action plan...');

            const netWorth = financialData?.netWorth?.total_net_worth || 0;
            const monthlyIncome = this.estimateMonthlyIncome(financialData);

            const prompt = `Create a detailed action plan based on this strategy:

STRATEGY SUMMARY:
${strategy?.summary || 'Wealth creation and portfolio optimization'}

KEY METRICS:
- Net Worth: ₹${(netWorth / 100000).toFixed(2)}L
- Portfolio Return: ${quantAnalysis?.metrics?.portfolioReturn?.formatted || 'N/A'}
- Monthly Income (Est.): ₹${monthlyIncome.toLocaleString('en-IN')}

RECOMMENDATIONS:
${strategy?.recommendations?.join('\n') || 'Diversified investment approach'}

Create:
1. IMMEDIATE ACTIONS (This Week) - 3-5 specific steps
2. SHORT-TERM ACTIONS (This Month) - 3-5 steps
3. MEDIUM-TERM ACTIONS (Next 3 Months) - 3-5 steps
4. LONG-TERM GOALS (Next Year) - 2-3 goals

For each action include: platform, documents needed, time required, success metric.`;

            let actionPlanText = '';

            if (this.useOpenAI) {
                actionPlanText = await openaiService.chat([
                    { role: 'system', content: 'You are a financial action planner. Create specific, actionable steps.' },
                    { role: 'user', content: prompt }
                ], { temperature: 0.4, maxTokens: 1500 });
            } else {
                await this._initializeModel();
                if (this.model) {
                    const result = await this.model.generateContent(prompt);
                    actionPlanText = result.response.text();
                }
            }

            const actionPlan = this.parseActionPlan(actionPlanText, strategy, financialData);
            
            logger.success('DOER: Action plan created');
            return actionPlan;

		} catch (error) {
            logger.error('Action plan creation error', error);
            return this._getDefaultActionPlan(strategy, financialData);
        }
    }

    parseActionPlan(text, strategy, financialData) {
        const monthlyIncome = this.estimateMonthlyIncome(financialData);
        const sipAmount = Math.round(monthlyIncome * 0.2);

        // Try to extract structured actions from AI response
        const immediateActions = this.extractActions(text, 'immediate') || [
            {
                action: 'Set up emergency fund target',
                platform: 'Liquid Fund via Groww/Kuvera',
                timeline: '1-2 days',
                priority: 'Critical',
                documents: ['Bank account', 'KYC documents'],
                successMetric: '3 months expenses saved'
            },
            {
                action: 'Start SIP in diversified equity fund',
                platform: 'Zerodha Coin / Kuvera',
                timeline: '2-3 days',
                amount: `₹${sipAmount.toLocaleString('en-IN')}/month`,
                priority: 'High',
                documents: ['PAN Card', 'Bank mandate'],
                successMetric: 'First SIP debited'
            },
            {
                action: 'Review and optimize tax-saving investments',
                platform: 'Check existing ELSS/PPF/NPS',
                timeline: '1 week',
                priority: 'High',
                documents: ['Investment statements'],
                successMetric: '80C limit utilized'
            }
        ];

        const shortTermActions = this.extractActions(text, 'short') || [
            {
                action: 'Get term insurance coverage',
                platform: 'PolicyBazaar / HDFC Life',
                timeline: '2 weeks',
                priority: 'Critical',
                coverageRecommended: `₹${Math.round(monthlyIncome * 120 / 100000) * 100000}`,
                documents: ['Medical reports', 'Income proof'],
                successMetric: 'Policy issued'
            },
            {
                action: 'Open NPS account for additional tax benefit',
                platform: 'eNPS portal / Bank',
                timeline: '1 week',
                priority: 'Medium',
                annualContribution: '₹50,000',
                documents: ['Aadhaar', 'PAN', 'Bank account'],
                successMetric: 'First contribution made'
            },
            {
                action: 'Consolidate mutual fund portfolio',
                platform: 'MF Central / CAMSOnline',
                timeline: '2-3 weeks',
                priority: 'Medium',
                documents: ['Folio statements'],
                successMetric: 'Single statement access'
            }
        ];

        const mediumTermActions = this.extractActions(text, 'medium') || [
            {
                action: 'Quarterly portfolio rebalancing',
                platform: 'Your investment platform',
                timeline: '3 months',
                priority: 'Medium',
                documents: ['Current portfolio statement'],
                successMetric: 'Asset allocation within 5% of target'
            },
            {
                action: 'Review insurance coverage adequacy',
                platform: 'PolicyBazaar / Existing policies',
                timeline: '2 months',
                priority: 'Medium',
                documents: ['Policy documents'],
                successMetric: 'Coverage meets life stage needs'
            },
            {
                action: 'Start tracking expenses systematically',
                platform: 'Money Manager / Wallet apps',
                timeline: 'Ongoing',
                priority: 'Medium',
                documents: ['None'],
                successMetric: 'Monthly budget vs actual tracking'
            }
        ];

        const longTermGoals = this.extractActions(text, 'long') || [
            {
                goal: 'Build retirement corpus',
                targetAmount: `₹${Math.round(monthlyIncome * 300 / 100000) * 100000}`,
                timeline: '20 years',
                strategy: 'Maximize NPS + Equity MFs + EPF',
                successMetric: 'Annual corpus growth of 12%+'
            },
            {
                goal: 'Financial independence',
                definition: '25x annual expenses in investments',
                timeline: '15-20 years',
                strategy: 'Consistent SIPs + Income growth investment',
                successMetric: 'Passive income covers 50% expenses'
            }
        ];

		return {
            summary: text || 'Comprehensive action plan created',
            immediateActions,
            shortTermActions,
            mediumTermActions,
            longTermGoals,
            implementationGuide: this.createImplementationGuide(),
            trackingMetrics: this.defineTrackingMetrics(),
            confidence: 0.85,
            timestamp: new Date().toISOString()
        };
    }

    extractActions(text, timeframe) {
        // Simple extraction - in production, use more sophisticated parsing
        const lines = text.split('\n');
        const actions = [];
        let inSection = false;

        const sectionKeywords = {
            immediate: ['immediate', 'this week', 'now', 'today'],
            short: ['short-term', 'this month', '30 days'],
            medium: ['medium-term', '3 months', 'quarter'],
            long: ['long-term', 'year', 'annual', 'goals']
        };

        const keywords = sectionKeywords[timeframe] || [];

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            // Check if we're entering the relevant section
            if (keywords.some(kw => lowerLine.includes(kw))) {
                inSection = true;
                continue;
            }

            // Check if we're leaving the section (new section header)
            if (inSection && (lowerLine.includes('action') || lowerLine.includes('goal') || lowerLine.includes('term')) && 
                !keywords.some(kw => lowerLine.includes(kw))) {
                break;
            }

            // Extract action items
            if (inSection && line.match(/^\d+\.|^-|^•|\*\*/)) {
                const actionText = line.replace(/^\d+\.|^-|^•|\*\*/g, '').trim();
                if (actionText.length > 10) {
                    actions.push({
                        action: actionText,
                        platform: 'To be determined',
                        timeline: timeframe === 'immediate' ? '1 week' : 
                                  timeframe === 'short' ? '1 month' : 
                                  timeframe === 'medium' ? '3 months' : '1 year',
                        priority: 'Medium'
                    });
                }
            }
        }

        return actions.length > 0 ? actions.slice(0, 5) : null;
    }

    estimateMonthlyIncome(financialData) {
        if (financialData?.transactions?.summary?.total_credits) {
            return financialData.transactions.summary.total_credits;
        }
        
        if (financialData?.netWorth?.total_net_worth) {
            // Rough estimate: net worth / 24 months
            return Math.round(financialData.netWorth.total_net_worth / 24);
        }
        
        return 75000; // Default estimate
    }

    createImplementationGuide() {
		return {
            sipSetup: {
                title: 'How to Start SIP',
                steps: [
                    '1. Complete KYC on platform (Zerodha/Groww/Kuvera)',
                    '2. Select fund based on your goal',
                    '3. Choose SIP date (prefer 1st week of month)',
                    '4. Set up bank mandate for auto-debit',
                    '5. Start with minimum amount, increase gradually'
                ],
                timeRequired: '15-30 minutes',
                platforms: ['Zerodha Coin', 'Groww', 'Kuvera', 'PaytmMoney']
            },
            npsSetup: {
                title: 'How to Open NPS Account',
                steps: [
                    '1. Visit eNPS portal (enps.nsdl.com)',
                    '2. Register with Aadhaar & PAN',
                    '3. Choose Tier I account',
                    '4. Select asset allocation (Active/Auto)',
                    '5. Make first contribution'
                ],
                timeRequired: '20-30 minutes',
                documents: ['Aadhaar', 'PAN', 'Bank Account']
            },
            taxPlanning: {
                title: '80C Investment Guide',
                options: [
                    'ELSS Mutual Funds (3-year lock-in, potentially highest returns)',
                    'PPF (15-year lock-in, guaranteed returns ~7-8%)',
                    'NPS (Additional ₹50K under 80CCD(1B))',
                    'Term Insurance Premium',
                    'Home Loan Principal Repayment'
                ],
                maxDeduction: '₹1,50,000 under 80C'
            }
        };
    }

    defineTrackingMetrics() {
        return [
            { metric: 'Net Worth Growth', target: '10-15% annually', frequency: 'Quarterly' },
            { metric: 'SIP Consistency', target: '100% months invested', frequency: 'Monthly' },
            { metric: 'Emergency Fund', target: '6 months expenses', frequency: 'Quarterly' },
            { metric: 'Insurance Coverage', target: '10x annual income', frequency: 'Annually' },
            { metric: 'Tax Efficiency', target: 'Max 80C utilized', frequency: 'Before March' },
            { metric: 'Portfolio Returns', target: 'Beat Nifty 50', frequency: 'Quarterly' }
        ];
    }

    _getDefaultActionPlan(strategy, financialData) {
        return {
            summary: 'Standard action plan created',
            immediateActions: [
                { action: 'Review current investments', priority: 'High', timeline: '1 week' },
                { action: 'Start SIP if not already', priority: 'High', timeline: '1 week' },
                { action: 'Check tax-saving status', priority: 'High', timeline: '1 week' }
            ],
            shortTermActions: [
                { action: 'Get adequate insurance', priority: 'Critical', timeline: '2 weeks' },
                { action: 'Build emergency fund', priority: 'High', timeline: '1 month' }
            ],
            mediumTermActions: [
                { action: 'Portfolio rebalancing', priority: 'Medium', timeline: '3 months' }
            ],
            longTermGoals: [
                { goal: 'Financial independence', timeline: '15+ years' }
            ],
            implementationGuide: this.createImplementationGuide(),
            trackingMetrics: this.defineTrackingMetrics(),
            confidence: 0.7,
            timestamp: new Date().toISOString()
        };
    }

    _getFallbackResponse(prompt) {
        logger.warn('DOER using fallback response');

        if (prompt.toLowerCase().includes('sip') || prompt.toLowerCase().includes('start')) {
            return `**How to Start Your SIP Journey** 🚀

**Step 1: Complete KYC** (15 mins)
- Platform: Zerodha, Groww, or Kuvera
- Documents: PAN Card, Aadhaar
- Video KYC available

**Step 2: Select Your Fund** (Research)
- For beginners: Nifty 50 Index Fund
- For moderate risk: Flexi Cap Fund
- For aggressive: Mid/Small Cap Fund

**Step 3: Set Up SIP**
- Minimum: ₹100-500 (platform dependent)
- Recommended: At least 20% of monthly income
- Date: Choose 1st week of month

**Step 4: Bank Mandate**
- Auto-debit from savings account
- NACH/eMandate registration

**Top Platforms for SIP:**
1. **Zerodha Coin** - Best for existing Zerodha users
2. **Groww** - User-friendly mobile app
3. **Kuvera** - Best for direct MF investing
4. **PaytmMoney** - Integrated with Paytm ecosystem

**Pro Tip:** Start small, increase by 10% annually (step-up SIP)

Would you like specific fund recommendations based on your goals?`;
        }

        return `As your Action Planner, I help you execute financial strategies:

⚡ **Immediate Actions**
- Investment account setup
- SIP initiation
- Insurance purchases

📋 **Platform Guidance**
- Zerodha, Groww, Kuvera for MFs
- eNPS for pension account
- PolicyBazaar for insurance

📝 **Document Checklist**
- PAN Card
- Aadhaar
- Bank statements
- Income proof

📊 **Progress Tracking**
- Monthly review milestones
- Quarterly rebalancing reminders
- Annual goal assessment

What action would you like to take?`;
    }
}

export default DoerAgent;
