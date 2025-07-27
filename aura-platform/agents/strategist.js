import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class StrategistAgent {
	constructor() {
		this.genAI = null;
		this.model = null;
		this.agentName = "Strategist Agent";
		this.expertise = "Financial strategy and planning";
	}

	_initializeModel() {
		if (!this.genAI) {
			if (!process.env.GEMINI_API_KEY) {
				throw new Error("GEMINI_API_KEY not found in environment variables");
			}
			this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
			this.model = this.genAI.getGenerativeModel({
				model: "gemini-2.0-flash",
			});
		}
		return this.model;
	}

	async generatePersonalizedPlan(userProfile, financialData, goals) {
		try {
			const prompt = `
You are the Strategist Agent in AURA's multi-agent financial system. Your role is to create comprehensive, personalized financial strategies.

User Profile:
${JSON.stringify(userProfile, null, 2)}

Financial Data:
${JSON.stringify(financialData, null, 2)}

Goals:
${JSON.stringify(goals, null, 2)}

Based on this information, create a detailed financial strategy that includes:

1. Current Financial Health Assessment
2. Risk Profile Analysis
3. Short-term Goals (1-2 years)
4. Medium-term Goals (3-5 years)
5. Long-term Goals (5+ years)
6. Investment Strategy Recommendations
7. Emergency Fund Planning
8. Debt Management Strategy
9. Tax Optimization Suggestions
10. Specific Action Items with Timeline

Ensure your strategy is:
- Practical and actionable
- Aligned with user's risk tolerance
- Considers current market conditions
- Accounts for inflation and economic factors
- Provides specific allocation percentages
- Includes contingency plans

Format your response as a structured JSON object with clear sections and actionable recommendations.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;
			const strategy = response.text();

			// Try to parse as JSON, fallback to structured text
			try {
				return {
					agent: this.agentName,
					strategy: JSON.parse(strategy),
					confidence: this.calculateConfidence(userProfile, financialData),
					timestamp: new Date().toISOString(),
				};
			} catch (parseError) {
				return {
					agent: this.agentName,
					strategy: strategy,
					confidence: this.calculateConfidence(userProfile, financialData),
					timestamp: new Date().toISOString(),
				};
			}
		} catch (error) {
			console.error("Strategist Agent error:", error);
			throw new Error(`Strategy generation failed: ${error.message}`);
		}
	}

	async optimizeStrategy(currentStrategy, marketConditions, newData) {
		try {
			const prompt = `
As the Strategist Agent, optimize the existing financial strategy based on new market conditions and data.

Current Strategy:
${JSON.stringify(currentStrategy, null, 2)}

Market Conditions:
${JSON.stringify(marketConditions, null, 2)}

New Data:
${JSON.stringify(newData, null, 2)}

Provide strategy optimizations including:
1. What to change and why
2. New allocation recommendations
3. Risk adjustments
4. Timeline modifications
5. Priority reordering

Focus on maintaining long-term goals while adapting to current conditions.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			return {
				agent: this.agentName,
				optimizations: response.text(),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Strategy optimization error:", error);
			throw new Error(`Strategy optimization failed: ${error.message}`);
		}
	}

	async collaborateWithAgents(agentInputs) {
		try {
			const prompt = `
As the Strategist Agent, synthesize inputs from other agents to create a unified strategy:

Quant Agent Analysis: ${agentInputs.quant || "Not available"}
Realist Agent Data: ${agentInputs.realist || "Not available"}
Doer Agent Feedback: ${agentInputs.doer || "Not available"}

Create a cohesive strategy that:
1. Incorporates quantitative insights
2. Considers real market data
3. Accounts for practical implementation
4. Balances all perspectives

Provide specific recommendations for strategy adjustments.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			return {
				agent: this.agentName,
				collaborativeStrategy: response.text(),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Agent collaboration error:", error);
			throw new Error(`Agent collaboration failed: ${error.message}`);
		}
	}

	calculateConfidence(userProfile, financialData) {
		let confidence = 0.5; // Base confidence

		// Increase confidence based on data completeness
		if (userProfile && Object.keys(userProfile).length > 0) confidence += 0.1;
		if (financialData && financialData.netWorth) confidence += 0.1;
		if (financialData && financialData.assets) confidence += 0.1;
		if (financialData && financialData.liabilities) confidence += 0.1;
		if (financialData && financialData.transactions) confidence += 0.1;

		return Math.min(confidence, 0.95); // Cap at 95%
	}

	getStatus() {
		return {
			agent: this.agentName,
			status: "active",
			capabilities: [
				"Financial strategy generation",
				"Goal-based planning",
				"Risk assessment",
				"Multi-agent collaboration",
				"Strategy optimization",
			],
			model: "gemini-2.0-flash-exp",
		};
	}

	// General response method for chat interactions
	async generateResponse(prompt, options = {}) {
		try {
			const systemPrompt = `You are the Strategist Agent of AURA, an AI financial intelligence platform. You specialize in:
			
- **Financial Strategy & Planning**: Creating comprehensive financial plans tailored to individual goals and circumstances
- **Risk Assessment**: Evaluating and managing various types of financial risk
- **Asset Allocation**: Designing optimal portfolio compositions
- **Goal-Based Planning**: Aligning financial strategies with life objectives
- **Long-term Wealth Creation**: Building sustainable financial growth strategies

Your responses should be:
- Strategic and forward-thinking
- Personalized to the user's situation
- Focused on long-term financial success
- Risk-aware and balanced
- Actionable and practical

Always maintain a professional, trustworthy tone while being accessible to users with varying financial knowledge levels.`;

			const fullPrompt = `${systemPrompt}\n\nUser Query: ${prompt}\n\nResponse:`;

			const model = this._initializeModel();
			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
				generationConfig: {
					temperature: options.temperature || 0.7,
					maxOutputTokens: options.maxTokens || 300,
					topP: 0.8,
					topK: 40,
				},
			});

			return result.response.text();
		} catch (error) {
			console.error("Strategist response generation error:", error);
			return this._generateFallbackResponse(prompt);
		}
	}

	_generateFallbackResponse(prompt) {
		const lowerPrompt = prompt.toLowerCase();
		
		if (lowerPrompt.includes('invest') || lowerPrompt.includes('portfolio')) {
			return `**Strategic Investment Guidance**:

🎯 **Core Investment Strategy**:
1. **Asset Allocation**: Diversify across equity (60-70%), debt (20-30%), and alternative investments (5-10%)
2. **Time Horizon**: Align investments with your financial goals timeline
3. **Risk Management**: Balance growth potential with downside protection
4. **Regular Review**: Monitor and rebalance portfolio quarterly

💰 **Wealth Building Approach**:
- **Emergency Fund**: Maintain 6-12 months of expenses in liquid funds
- **SIP Strategy**: Use systematic investment plans for rupee cost averaging
- **Goal-Based Investing**: Separate buckets for different life goals
- **Tax Optimization**: Utilize 80C, ELSS, and other tax-saving instruments

📈 **Long-term Strategy**:
- Focus on quality companies and funds with strong track records
- Stay invested through market cycles for compounding benefits
- Gradually increase exposure to equity as you gain experience
- Consider international diversification for portfolio resilience

*Note: This is general strategic guidance. Consider your personal financial situation and consult an advisor for personalized advice.*`;
		}
		
		if (lowerPrompt.includes('goal') || lowerPrompt.includes('plan')) {
			return `**Strategic Financial Planning**:

🎯 **Goal Setting Framework**:
1. **Short-term (1-2 years)**: Emergency fund, immediate purchases
2. **Medium-term (3-7 years)**: Home down payment, children's education
3. **Long-term (8+ years)**: Retirement, wealth creation

📊 **Strategic Approach**:
- **SMART Goals**: Specific, Measurable, Achievable, Relevant, Time-bound
- **Priority Matrix**: Focus on high-impact financial decisions first
- **Scenario Planning**: Prepare for multiple future outcomes
- **Regular Tracking**: Monitor progress and adjust strategy as needed

🔄 **Implementation Strategy**:
- Start with highest priority goals
- Automate investments where possible
- Review and adjust annually
- Maintain flexibility for life changes

*This framework can be customized based on your specific situation and risk tolerance.*`;
		}

		return `**Strategic Financial Guidance**:

As your financial strategist, I recommend focusing on these key principles:

🎯 **Strategic Foundation**:
1. **Clear Objectives**: Define specific financial goals with timelines
2. **Risk Assessment**: Understand your risk tolerance and capacity
3. **Diversification**: Spread investments across asset classes and sectors
4. **Systematic Approach**: Use regular investment habits like SIPs

📈 **Long-term Strategy**:
- Build a strong financial foundation before taking higher risks
- Focus on consistent, disciplined investing over market timing
- Regularly review and rebalance your portfolio
- Stay informed but avoid emotional decision-making

💡 **Strategic Mindset**:
- Think long-term while managing short-term needs
- Invest in your financial education continuously
- Seek professional advice for complex decisions
- Remember that successful investing is a marathon, not a sprint

*This is general strategic guidance tailored to sound financial principles. Always consider your unique circumstances.*`;
	}
}
