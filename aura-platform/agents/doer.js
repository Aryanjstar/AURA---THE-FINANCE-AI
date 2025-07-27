import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class DoerAgent {
	constructor() {
		this.genAI = null;
		this.model = null;
		this.agentName = "Doer Agent";
		this.expertise = "Action planning and implementation";
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

	async createActionPlan(strategy, analysis, userProfile) {
		try {
			const prompt = `
You are the Doer Agent in AURA's multi-agent system. Your role is to convert strategic plans and analysis into specific, actionable steps.

Strategy from Strategist Agent:
${JSON.stringify(strategy, null, 2)}

Analysis from Quant Agent:
${JSON.stringify(analysis, null, 2)}

User Profile:
${JSON.stringify(userProfile, null, 2)}

Create a detailed action plan with:

1. IMMEDIATE ACTIONS (Next 7 days):
   - Specific tasks with deadlines
   - Required documents/information
   - Platform/app recommendations
   - Exact amounts and percentages

2. SHORT-TERM ACTIONS (1-3 months):
   - Investment allocations
   - Account openings needed
   - SIP setups with amounts
   - Debt management steps

3. MEDIUM-TERM ACTIONS (3-12 months):
   - Portfolio rebalancing schedule
   - Goal-based investments
   - Insurance reviews
   - Tax planning activities

4. LONG-TERM ACTIONS (1+ years):
   - Major financial milestones
   - Review and adjustment schedule
   - Exit strategies

For each action, provide:
- Exact steps to take
- Recommended platforms/brokers
- Specific amounts or percentages
- Timeline with deadlines
- Success metrics
- Potential obstacles and solutions
- Priority level (High/Medium/Low)

Make everything practical and implementable. Include specific Indian financial products, platforms, and regulations where applicable.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			const actionPlan = this.parseAndStructureActionPlan(response.text());

			return {
				agent: this.agentName,
				actionPlan,
				implementationGuide: this.createImplementationGuide(actionPlan),
				trackingMetrics: this.defineTrackingMetrics(actionPlan),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Doer Agent error:", error);
			throw new Error(`Action plan creation failed: ${error.message}`);
		}
	}

	parseAndStructureActionPlan(rawPlan) {
		try {
			// Try to extract structured data from the AI response
			const sections = {
				immediate: [],
				shortTerm: [],
				mediumTerm: [],
				longTerm: [],
			};

			const lines = rawPlan.split("\n");
			let currentSection = null;
			let currentAction = null;

			for (const line of lines) {
				const trimmedLine = line.trim();

				if (trimmedLine.includes("IMMEDIATE ACTIONS")) {
					currentSection = "immediate";
				} else if (trimmedLine.includes("SHORT-TERM ACTIONS")) {
					currentSection = "shortTerm";
				} else if (trimmedLine.includes("MEDIUM-TERM ACTIONS")) {
					currentSection = "mediumTerm";
				} else if (trimmedLine.includes("LONG-TERM ACTIONS")) {
					currentSection = "longTerm";
				} else if (trimmedLine.startsWith("-") || trimmedLine.match(/^\d+\./)) {
					if (currentSection && currentAction) {
						sections[currentSection].push(currentAction);
					}
					currentAction = {
						title: trimmedLine.replace(/^[-\d.]\s*/, ""),
						steps: [],
						priority: this.extractPriority(trimmedLine),
						timeline: this.extractTimeline(trimmedLine),
						amount: this.extractAmount(trimmedLine),
					};
				} else if (trimmedLine && currentAction) {
					currentAction.steps.push(trimmedLine);
				}
			}

			// Add the last action
			if (currentSection && currentAction) {
				sections[currentSection].push(currentAction);
			}

			return sections;
		} catch (error) {
			console.error("Action plan parsing error:", error);
			return {
				immediate: [
					{
						title: "Review financial data",
						steps: ["Complete portfolio analysis"],
						priority: "High",
					},
				],
				shortTerm: [],
				mediumTerm: [],
				longTerm: [],
			};
		}
	}

	extractPriority(text) {
		const priorities = ["High", "Medium", "Low"];
		for (const priority of priorities) {
			if (text.toLowerCase().includes(priority.toLowerCase())) {
				return priority;
			}
		}
		return "Medium";
	}

	extractTimeline(text) {
		const timelineRegex = /(\d+)\s*(day|week|month|year)s?/i;
		const match = text.match(timelineRegex);
		if (match) {
			return `${match[1]} ${match[2]}${match[1] > 1 ? "s" : ""}`;
		}
		return null;
	}

	extractAmount(text) {
		const amountRegex = /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*%/g;
		const matches = text.match(amountRegex);
		return matches ? matches[0] : null;
	}

	createImplementationGuide(actionPlan) {
		const guide = {
			weeklyChecklist: this.createWeeklyChecklist(actionPlan),
			platformRecommendations: this.getPlatformRecommendations(),
			documentationNeeded: this.getRequiredDocuments(),
			commonPitfalls: this.getCommonPitfalls(),
			successMetrics: this.getSuccessMetrics(),
		};

		return guide;
	}

	createWeeklyChecklist(actionPlan) {
		const checklist = [];

		// Add immediate actions to weekly checklist
		if (actionPlan.immediate) {
			actionPlan.immediate.forEach((action) => {
				checklist.push({
					week: 1,
					task: action.title,
					priority: action.priority || "Medium",
					completed: false,
				});
			});
		}

		// Add short-term actions to appropriate weeks
		if (actionPlan.shortTerm) {
			actionPlan.shortTerm.forEach((action, index) => {
				checklist.push({
					week: Math.floor(index / 2) + 2, // Spread over weeks 2-6
					task: action.title,
					priority: action.priority || "Medium",
					completed: false,
				});
			});
		}

		return checklist;
	}

	getPlatformRecommendations() {
		return {
			stockBrokers: [
				{
					name: "Zerodha",
					features: ["Low brokerage", "Good app", "Research tools"],
					rating: 4.5,
				},
				{
					name: "Groww",
					features: ["Beginner-friendly", "Mutual funds", "Stocks"],
					rating: 4.3,
				},
				{
					name: "Angel One",
					features: ["Research", "Advisory", "Multiple products"],
					rating: 4.2,
				},
			],
			mutualFunds: [
				{
					name: "Coin by Zerodha",
					features: ["Direct plans", "No commission", "Portfolio tracking"],
					rating: 4.4,
				},
				{
					name: "Kuvera",
					features: [
						"Goal-based investing",
						"Tax optimization",
						"Free platform",
					],
					rating: 4.3,
				},
				{
					name: "Groww",
					features: ["Simple interface", "SIP automation", "Goal tracking"],
					rating: 4.2,
				},
			],
			digitalGold: [
				{
					name: "Paytm Gold",
					features: ["Small amounts", "Secure storage", "Easy buying"],
					rating: 4.1,
				},
				{
					name: "PhonePe Gold",
					features: ["Integration with payments", "Gold SIP", "Buyback"],
					rating: 4.0,
				},
			],
			insurance: [
				{
					name: "PolicyBazaar",
					features: ["Comparison", "Multiple insurers", "Claims support"],
					rating: 4.2,
				},
				{
					name: "Tata AIG",
					features: ["Direct plans", "Good claims ratio", "Health focus"],
					rating: 4.1,
				},
			],
		};
	}

	getRequiredDocuments() {
		return [
			"PAN Card",
			"Aadhaar Card",
			"Bank Account Details",
			"Salary Slips (last 3 months)",
			"Bank Statements (last 6 months)",
			"ITR (last 2 years)",
			"Passport Size Photos",
			"Cancelled Cheque",
			"Address Proof",
			"Income Proof",
			"Investment Statements (existing)",
			"Insurance Policies (existing)",
			"Property Documents (if applicable)",
			"Loan Statements (if applicable)",
		];
	}

	getCommonPitfalls() {
		return [
			{
				pitfall: "Starting without emergency fund",
				solution: "Build 6-month emergency fund before investing",
				impact: "High",
			},
			{
				pitfall: "Putting all money in one investment",
				solution: "Diversify across asset classes and instruments",
				impact: "High",
			},
			{
				pitfall: "Timing the market",
				solution:
					"Use SIP for consistent investing regardless of market conditions",
				impact: "Medium",
			},
			{
				pitfall: "Ignoring tax implications",
				solution: "Consider tax-saving instruments and LTCG/STCG implications",
				impact: "Medium",
			},
			{
				pitfall: "Not reviewing investments regularly",
				solution: "Set quarterly review schedule and rebalance annually",
				impact: "Medium",
			},
			{
				pitfall: "Choosing regular plans over direct plans",
				solution:
					"Always opt for direct mutual fund plans to save on expense ratio",
				impact: "Low",
			},
		];
	}

	getSuccessMetrics() {
		return {
			monthly: [
				"Emergency fund target achievement (%)",
				"SIP automation setup completion",
				"Expense tracking accuracy",
				"Debt reduction progress",
			],
			quarterly: [
				"Portfolio diversification ratio",
				"Goal-based allocation progress",
				"Investment performance vs benchmarks",
				"Risk profile alignment",
			],
			annual: [
				"Net worth growth (%)",
				"XIRR achievement vs targets",
				"Goal milestone completion",
				"Tax optimization effectiveness",
			],
		};
	}

	defineTrackingMetrics(actionPlan) {
		const metrics = {
			completionRate: 0,
			milestones: [],
			kpis: {},
			alerts: [],
		};

		// Calculate total actions
		const totalActions = [
			...(actionPlan.immediate || []),
			...(actionPlan.shortTerm || []),
			...(actionPlan.mediumTerm || []),
			...(actionPlan.longTerm || []),
		].length;

		metrics.totalActions = totalActions;

		// Define milestones
		metrics.milestones = [
			{
				name: "Emergency Fund Complete",
				target: "6 months expenses",
				timeline: "3 months",
			},
			{
				name: "Investment Automation Setup",
				target: "100% SIP automation",
				timeline: "1 month",
			},
			{
				name: "Portfolio Diversification",
				target: "Achieve target allocation",
				timeline: "6 months",
			},
			{
				name: "Debt Optimization",
				target: "Reduce high-interest debt by 50%",
				timeline: "12 months",
			},
			{
				name: "Goal-based Investing",
				target: "All goals have dedicated investments",
				timeline: "3 months",
			},
		];

		// Define KPIs
		metrics.kpis = {
			financial: {
				netWorthGrowth: { target: "15%", current: "0%", unit: "annual" },
				portfolioXIRR: { target: "12%", current: "0%", unit: "annual" },
				emergencyFundRatio: { target: "6", current: "0", unit: "months" },
				debtToIncomeRatio: { target: "20%", current: "0%", unit: "percentage" },
			},
			behavioral: {
				sipConsistency: { target: "100%", current: "0%", unit: "percentage" },
				budgetAdherence: { target: "90%", current: "0%", unit: "percentage" },
				reviewFrequency: { target: "4", current: "0", unit: "times/year" },
			},
		};

		return metrics;
	}

	async optimizeImplementation(currentProgress, obstacles, userFeedback) {
		try {
			const prompt = `
As the Doer Agent, optimize the implementation plan based on current progress and feedback:

Current Progress:
${JSON.stringify(currentProgress, null, 2)}

Obstacles Encountered:
${JSON.stringify(obstacles, null, 2)}

User Feedback:
${JSON.stringify(userFeedback, null, 2)}

Provide optimizations including:
1. Modified action priorities
2. Alternative implementation approaches
3. Timeline adjustments
4. Resource reallocation
5. Risk mitigation strategies
6. Motivation and engagement tactics

Focus on practical solutions that maintain momentum toward financial goals.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			return {
				agent: this.agentName,
				optimizations: response.text(),
				adjustedTimeline: this.adjustTimeline(currentProgress),
				alternativeApproaches: this.suggestAlternatives(obstacles),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Implementation optimization error:", error);
			throw new Error(`Implementation optimization failed: ${error.message}`);
		}
	}

	adjustTimeline(progress) {
		// Logic to adjust timelines based on progress
		const adjustments = [];

		if (progress.completionRate < 50) {
			adjustments.push({
				type: "extension",
				reason: "Lower than expected completion rate",
				adjustment: "+2 weeks for short-term goals",
			});
		}

		if (progress.obstacles && progress.obstacles.length > 0) {
			adjustments.push({
				type: "resequencing",
				reason: "Obstacles identified",
				adjustment: "Prioritize easier wins first",
			});
		}

		return adjustments;
	}

	suggestAlternatives(obstacles) {
		const alternatives = [];

		obstacles?.forEach((obstacle) => {
			switch (obstacle.type) {
				case "financial":
					alternatives.push({
						original: obstacle.description,
						alternative: "Start with smaller amounts and increase gradually",
						rationale: "Builds habit while managing cash flow",
					});
					break;
				case "technical":
					alternatives.push({
						original: obstacle.description,
						alternative: "Use simpler platforms or get assistance",
						rationale: "Reduces complexity and learning curve",
					});
					break;
				case "time":
					alternatives.push({
						original: obstacle.description,
						alternative: "Automate processes and use mobile apps",
						rationale: "Reduces time commitment and increases convenience",
					});
					break;
				default:
					alternatives.push({
						original: obstacle.description,
						alternative: "Break down into smaller, manageable steps",
						rationale: "Reduces overwhelm and increases success probability",
					});
			}
		});

		return alternatives;
	}

	getStatus() {
		return {
			agent: this.agentName,
			status: "active",
			capabilities: [
				"Action plan creation",
				"Implementation guidance",
				"Progress tracking",
				"Obstacle resolution",
				"Timeline optimization",
				"Platform recommendations",
			],
			model: "gemini-2.0-flash-exp",
		};
	}

	// General response method for chat interactions
	async generateResponse(prompt, options = {}) {
		try {
			const systemPrompt = `You are the Doer Agent of AURA, an AI financial intelligence platform. You excel at:

- **Action Planning**: Converting strategies into specific, actionable steps
- **Implementation Guidance**: Providing detailed instructions for executing financial plans  
- **Platform Recommendations**: Suggesting specific apps, websites, and services for implementation
- **Timeline Management**: Creating realistic schedules with deadlines and milestones
- **Obstacle Resolution**: Identifying potential challenges and providing solutions
- **Progress Tracking**: Setting up systems to monitor and measure progress

Your responses should be:
- Highly specific and actionable
- Include exact steps, amounts, and timelines
- Recommend specific platforms and tools
- Anticipate and address potential obstacles
- Focus on immediate next actions

Always provide concrete, implementable advice with step-by-step instructions. Include specific platform recommendations, exact amounts, and realistic timelines.`;

			const fullPrompt = `${systemPrompt}\n\nUser Query: ${prompt}\n\nResponse:`;

			const model = this._initializeModel();
			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
				generationConfig: {
					temperature: options.temperature || 0.5,
					maxOutputTokens: options.maxTokens || 400,
					topP: 0.8,
					topK: 40,
				},
			});

			return result.response.text();
		} catch (error) {
			console.error("Doer response generation error:", error);
			return this._generateFallbackResponse(prompt);
		}
	}

	_generateFallbackResponse(prompt) {
		const lowerPrompt = prompt.toLowerCase();
		
		if (lowerPrompt.includes('sip') || lowerPrompt.includes('systematic')) {
			return `**Action Plan: Start SIP Investment**

🎯 **Immediate Actions (This Week)**:
1. **Complete KYC**: Visit nearest MF office or use online KYC
2. **Choose Platform**: Use Groww, Kuvera, or direct AMC websites
3. **Set Bank Mandate**: Enable auto-debit for your investment amount
4. **Select Date**: Choose SIP date (1st, 10th, or 15th work best)

📱 **Recommended Platforms**:
- **Groww**: User-friendly, zero commission
- **Kuvera**: Advanced features, direct plans
- **Paytm Money**: Integrated with existing Paytm account
- **Direct AMC**: HDFC, ICICI, SBI websites

💰 **Implementation Steps**:
1. Start with ₹1,000-5,000 monthly amount
2. Choose large-cap equity fund for beginners
3. Set up automatic bank debit mandate
4. Monitor monthly for first 3 months

⏰ **Timeline**:
- **Week 1**: Complete KYC and choose platform
- **Week 2**: Start first SIP
- **Month 1**: Review and adjust if needed

🔄 **Next Steps**: Once comfortable, add mid-cap or international funds for diversification.`;
		}
		
		if (lowerPrompt.includes('emergency') || lowerPrompt.includes('fund')) {
			return `**Action Plan: Build Emergency Fund**

🎯 **Immediate Actions (Next 7 Days)**:
1. **Calculate Target**: 6-12 months of essential expenses
2. **Open Liquid Fund**: Use apps like Groww or Kuvera
3. **Set Monthly Transfer**: Automate ₹5,000-10,000 monthly
4. **Track Progress**: Use spreadsheet or app like Money Manager

💳 **Recommended Accounts**:
- **Liquid Mutual Funds**: Better returns than savings account
- **High-Yield Savings**: IDFC First, IndusInd, or Kotak 811
- **Fixed Deposits**: If you prefer guaranteed returns

📱 **Implementation Tools**:
- **Money Manager**: Track expenses and emergency fund progress
- **ET Money**: Investment tracking and goal setting
- **CRED**: Credit card management and investment options

💰 **Action Timeline**:
- **Day 1-3**: Calculate exact emergency fund requirement
- **Day 4-7**: Open liquid fund account and make first investment
- **Week 2**: Set up automatic monthly transfer
- **Month 1**: Review progress and adjust amount if needed

🎯 **Target**: Complete emergency fund in 12-18 months maximum.`;
		}

		return `**Actionable Implementation Plan**:

🎯 **Immediate Next Steps (This Week)**:
1. **Assess Current Situation**: List all assets, debts, and monthly expenses
2. **Set Clear Goals**: Define 3 specific financial objectives with timelines
3. **Choose Investment Platform**: Research and open account on Groww/Kuvera
4. **Start Small**: Begin with ₹1,000 monthly SIP in large-cap fund

📱 **Recommended Tools & Platforms**:
- **Investment**: Groww, Kuvera, Zerodha Coin
- **Banking**: Check if your bank offers investment services
- **Tracking**: Money Manager, ET Money, or Excel spreadsheet
- **Learning**: YouTube channels (Labour Law Advisor, Pranjal Kamra)

💰 **Implementation Timeline**:
- **Week 1**: Complete assessment and goal setting
- **Week 2**: Open investment accounts and complete KYC
- **Week 3**: Start first investment/SIP
- **Month 1**: Review and optimize based on initial experience

🔄 **Monthly Review Process**:
- Track progress toward goals
- Adjust investment amounts based on income changes
- Review and rebalance portfolio quarterly
- Increase investments with salary hikes

🎯 **Success Metrics**: Consistent monthly investments, emergency fund progress, and growing portfolio value over 6-12 months.

*Take action on at least one item today to build momentum!*`;
	}
}
