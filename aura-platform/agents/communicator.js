import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class CommunicatorAgent {
	constructor() {
		this.genAI = null;
		this.model = null;
		this.agentName = "Communicator Agent";
		this.expertise = "User communication and engagement";
		this.communicationHistory = [];
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

	async generateUserCommunication(
		analysis,
		actionPlan,
		userProfile,
		preferences
	) {
		try {
			const prompt = `
You are the Communicator Agent in AURA's multi-agent system. Your role is to translate complex financial analysis and action plans into clear, engaging, and personalized communication for the user.

Financial Analysis:
${JSON.stringify(analysis, null, 2)}

Action Plan:
${JSON.stringify(actionPlan, null, 2)}

User Profile:
${JSON.stringify(userProfile, null, 2)}

Communication Preferences:
${JSON.stringify(preferences, null, 2)}

Create personalized communication that includes:

1. EXECUTIVE SUMMARY (2-3 sentences):
   - Current financial health score
   - Key opportunities identified
   - Primary recommendation

2. PERSONALIZED INSIGHTS:
   - What's working well in their portfolio
   - Areas needing attention
   - Comparison with peers/benchmarks
   - Risk assessment in simple terms

3. ACTION PRIORITIES:
   - Top 3 immediate actions (next 7 days)
   - Why each action matters
   - Expected impact/benefit
   - Simple steps to get started

4. MOTIVATION & ENGAGEMENT:
   - Progress celebrations
   - Goal visualization
   - Success stories/examples
   - Gentle nudges for action

5. EDUCATIONAL SNIPPETS:
   - One key financial concept explained simply
   - Why it matters for their specific situation
   - How to apply it

Communication Guidelines:
- Use simple, jargon-free language
- Be encouraging and supportive
- Include specific numbers and percentages
- Use analogies and examples
- Make it actionable and time-bound
- Address user by name when possible
- Match the tone to user preferences (formal/casual)

Format as a structured response with clear sections and engaging content.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			const communication = {
				agent: this.agentName,
				message: this.parseAndStructureCommunication(response.text()),
				deliveryMethod: this.selectDeliveryMethod(preferences),
				urgency: this.assessUrgency(actionPlan),
				followUpSchedule: this.scheduleFollowUps(actionPlan),
				timestamp: new Date().toISOString(),
			};

			this.communicationHistory.push(communication);
			return communication;
		} catch (error) {
			console.error("Communication generation error:", error);
			throw new Error(`Communication generation failed: ${error.message}`);
		}
	}

	parseAndStructureCommunication(rawMessage) {
		try {
			const sections = {
				executiveSummary: "",
				insights: [],
				actionPriorities: [],
				motivation: "",
				education: "",
			};

			const lines = rawMessage.split("\n");
			let currentSection = null;

			for (const line of lines) {
				const trimmedLine = line.trim();

				if (trimmedLine.toUpperCase().includes("EXECUTIVE SUMMARY")) {
					currentSection = "executiveSummary";
				} else if (
					trimmedLine.toUpperCase().includes("PERSONALIZED INSIGHTS")
				) {
					currentSection = "insights";
				} else if (trimmedLine.toUpperCase().includes("ACTION PRIORITIES")) {
					currentSection = "actionPriorities";
				} else if (trimmedLine.toUpperCase().includes("MOTIVATION")) {
					currentSection = "motivation";
				} else if (trimmedLine.toUpperCase().includes("EDUCATIONAL")) {
					currentSection = "education";
				} else if (trimmedLine && currentSection) {
					if (
						currentSection === "insights" ||
						currentSection === "actionPriorities"
					) {
						if (trimmedLine.startsWith("-") || trimmedLine.match(/^\d+\./)) {
							sections[currentSection].push(
								trimmedLine.replace(/^[-\d.]\s*/, "")
							);
						}
					} else {
						sections[currentSection] += trimmedLine + " ";
					}
				}
			}

			return sections;
		} catch (error) {
			console.error("Communication parsing error:", error);
			return {
				executiveSummary: rawMessage.substring(0, 200) + "...",
				insights: ["Analysis complete - detailed insights available"],
				actionPriorities: ["Review your financial dashboard"],
				motivation: "Great job on taking control of your financial future!",
				education: "Regular monitoring helps optimize your investment returns.",
			};
		}
	}

	selectDeliveryMethod(preferences) {
		const methods = [];

		// Primary method based on preferences
		if (preferences?.preferredChannel) {
			switch (preferences.preferredChannel) {
				case "email":
					methods.push({
						type: "email",
						priority: "primary",
						timing: "immediate",
					});
					break;
				case "sms":
					methods.push({
						type: "sms",
						priority: "primary",
						timing: "immediate",
					});
					break;
				case "app":
					methods.push({
						type: "push_notification",
						priority: "primary",
						timing: "immediate",
					});
					methods.push({
						type: "in_app_message",
						priority: "secondary",
						timing: "next_open",
					});
					break;
				default:
					methods.push({
						type: "in_app_message",
						priority: "primary",
						timing: "immediate",
					});
			}
		} else {
			// Default delivery methods
			methods.push({
				type: "in_app_message",
				priority: "primary",
				timing: "immediate",
			});
			methods.push({
				type: "push_notification",
				priority: "secondary",
				timing: "immediate",
			});
		}

		return methods;
	}

	assessUrgency(actionPlan) {
		let urgency = "low";

		try {
			// Check for high-priority immediate actions
			const immediateActions = actionPlan?.immediate || [];
			const highPriorityActions = immediateActions.filter(
				(action) =>
					action.priority === "High" ||
					action.title?.toLowerCase().includes("urgent")
			);

			if (highPriorityActions.length > 0) {
				urgency = "high";
			} else if (immediateActions.length > 2) {
				urgency = "medium";
			}

			// Check for financial risks that need immediate attention
			const riskKeywords = ["debt", "credit", "emergency", "loss", "default"];
			const hasRiskActions = immediateActions.some((action) =>
				riskKeywords.some((keyword) =>
					action.title?.toLowerCase().includes(keyword)
				)
			);

			if (hasRiskActions) {
				urgency = "high";
			}

			return urgency;
		} catch (error) {
			console.error("Urgency assessment error:", error);
			return "medium";
		}
	}

	scheduleFollowUps(actionPlan) {
		const followUps = [];

		try {
			// Schedule based on action plan timeline
			followUps.push({
				type: "progress_check",
				timing: "3 days",
				purpose: "Check completion of immediate actions",
				method: "push_notification",
			});

			followUps.push({
				type: "weekly_summary",
				timing: "7 days",
				purpose: "Weekly progress report and motivation",
				method: "email",
			});

			followUps.push({
				type: "goal_review",
				timing: "30 days",
				purpose: "Monthly goal review and strategy adjustment",
				method: "in_app_message",
			});

			// Add specific follow-ups based on action plan
			if (actionPlan?.shortTerm?.length > 0) {
				followUps.push({
					type: "short_term_milestone",
					timing: "2 weeks",
					purpose: "Check progress on short-term goals",
					method: "push_notification",
				});
			}

			return followUps;
		} catch (error) {
			console.error("Follow-up scheduling error:", error);
			return [
				{
					type: "progress_check",
					timing: "7 days",
					purpose: "General progress check",
					method: "push_notification",
				},
			];
		}
	}

	async generateMotivationalContent(userProgress, achievements, challenges) {
		try {
			const prompt = `
As the Communicator Agent, create motivational content based on user's financial journey:

User Progress:
${JSON.stringify(userProgress, null, 2)}

Recent Achievements:
${JSON.stringify(achievements, null, 2)}

Current Challenges:
${JSON.stringify(challenges, null, 2)}

Create motivational content that:
1. Celebrates specific achievements with numbers
2. Reframes challenges as opportunities
3. Provides perspective on long-term goals
4. Includes inspiring financial success principles
5. Offers actionable encouragement

Keep it positive, specific, and action-oriented. Use encouraging language that builds confidence.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			return {
				agent: this.agentName,
				motivationalMessage: response.text(),
				sentiment: "positive",
				actionCTA: this.extractCallToAction(response.text()),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Motivational content error:", error);
			return {
				motivationalMessage:
					"You're making great progress on your financial journey! Every step counts towards your goals.",
				sentiment: "positive",
				actionCTA: "Keep up the momentum!",
			};
		}
	}

	async generateEducationalContent(userLevel, topic, context) {
		try {
			const prompt = `
As the Communicator Agent, create educational content about "${topic}" for a user with ${userLevel} financial knowledge:

Context:
${JSON.stringify(context, null, 2)}

Create educational content that:
1. Explains the concept in simple terms
2. Shows why it matters for their specific situation
3. Provides practical examples
4. Includes actionable tips
5. Avoids jargon and complex terminology

Keep it concise (2-3 paragraphs), practical, and relevant to Indian financial markets and regulations.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			return {
				agent: this.agentName,
				educationalContent: response.text(),
				topic,
				difficulty: userLevel,
				relatedActions: this.suggestRelatedActions(topic),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Educational content error:", error);
			return {
				educationalContent: `${topic} is an important financial concept that can help you make better investment decisions. Consider learning more about it to improve your financial outcomes.`,
				topic,
				difficulty: userLevel,
			};
		}
	}

	extractCallToAction(message) {
		const ctaPatterns = [
			/take action by \w+/gi,
			/start \w+/gi,
			/begin \w+/gi,
			/consider \w+/gi,
			/try \w+/gi,
		];

		for (const pattern of ctaPatterns) {
			const match = message.match(pattern);
			if (match) {
				return match[0];
			}
		}

		return "Take the next step in your financial journey";
	}

	suggestRelatedActions(topic) {
		const actionMap = {
			diversification: [
				"Review current portfolio allocation",
				"Consider adding different asset classes",
			],
			"risk management": [
				"Assess current risk tolerance",
				"Review insurance coverage",
			],
			"goal planning": [
				"Define specific financial goals",
				"Create timeline for achievements",
			],
			"tax optimization": [
				"Review tax-saving investments",
				"Plan year-end tax strategies",
			],
			"emergency fund": [
				"Calculate 6-month expenses",
				"Set up automatic savings",
			],
			"debt management": [
				"List all debts with interest rates",
				"Create debt repayment plan",
			],
		};

		return (
			actionMap[topic.toLowerCase()] || [
				"Learn more about this topic",
				"Discuss with financial advisor",
			]
		);
	}

	async personalizeMessage(baseMessage, userProfile, context) {
		try {
			const personalization = {
				name: userProfile?.name || "there",
				goalContext: this.getGoalContext(userProfile?.goals),
				riskContext: this.getRiskContext(userProfile?.riskProfile),
				ageContext: this.getAgeContext(userProfile?.age),
				incomeContext: this.getIncomeContext(userProfile?.income),
			};

			let personalizedMessage = baseMessage;

			// Replace placeholders with personalized content
			personalizedMessage = personalizedMessage.replace(
				/\[NAME\]/g,
				personalization.name
			);
			personalizedMessage = personalizedMessage.replace(
				/\[GOAL_CONTEXT\]/g,
				personalization.goalContext
			);
			personalizedMessage = personalizedMessage.replace(
				/\[RISK_CONTEXT\]/g,
				personalization.riskContext
			);

			return personalizedMessage;
		} catch (error) {
			console.error("Message personalization error:", error);
			return baseMessage;
		}
	}

	getGoalContext(goals) {
		if (!goals || goals.length === 0) return "your financial goals";

		const primaryGoal = goals[0];
		return `your ${primaryGoal.name || "primary goal"}`;
	}

	getRiskContext(riskProfile) {
		const riskMap = {
			low: "conservative approach",
			medium: "balanced strategy",
			high: "growth-focused plan",
		};

		return riskMap[riskProfile?.toLowerCase()] || "investment approach";
	}

	getAgeContext(age) {
		if (!age) return "";

		if (age < 30) return "with plenty of time for long-term growth";
		if (age < 45) return "balancing growth and stability";
		if (age < 60) return "preparing for retirement";
		return "focusing on preservation and income";
	}

	getIncomeContext(income) {
		if (!income) return "";

		if (income < 500000) return "maximizing every rupee";
		if (income < 1000000) return "building solid foundations";
		if (income < 2500000) return "accelerating wealth creation";
		return "optimizing high-income strategies";
	}

	async deliverCommunication(communication, userContactInfo) {
		try {
			const deliveryResults = [];

			for (const method of communication.deliveryMethod) {
				try {
					let result;

					switch (method.type) {
						case "email":
							result = await this.sendEmail(communication, userContactInfo);
							break;
						case "sms":
							result = await this.sendSMS(communication, userContactInfo);
							break;
						case "push_notification":
							result = await this.sendPushNotification(
								communication,
								userContactInfo
							);
							break;
						case "in_app_message":
							result = await this.createInAppMessage(communication);
							break;
						default:
							result = { success: false, error: "Unknown delivery method" };
					}

					deliveryResults.push({
						method: method.type,
						priority: method.priority,
						success: result.success,
						error: result.error || null,
						timestamp: new Date().toISOString(),
					});
				} catch (error) {
					deliveryResults.push({
						method: method.type,
						success: false,
						error: error.message,
						timestamp: new Date().toISOString(),
					});
				}
			}

			return {
				communicationId: communication.timestamp,
				deliveryResults,
				overallSuccess: deliveryResults.some((r) => r.success),
			};
		} catch (error) {
			console.error("Communication delivery error:", error);
			throw new Error(`Communication delivery failed: ${error.message}`);
		}
	}

	async sendEmail(communication, contactInfo) {
		// In production, integrate with email service (SendGrid, AWS SES, etc.)
		console.log("📧 Email would be sent to:", contactInfo.email);
		console.log("Subject: AURA Financial Update");
		console.log("Content:", communication.message.executiveSummary);

		return { success: true, messageId: `email_${Date.now()}` };
	}

	async sendSMS(communication, contactInfo) {
		// In production, integrate with SMS service (Twilio, AWS SNS, etc.)
		const shortMessage = communication.message.executiveSummary.substring(
			0,
			160
		);
		console.log("📱 SMS would be sent to:", contactInfo.phone);
		console.log("Message:", shortMessage);

		return { success: true, messageId: `sms_${Date.now()}` };
	}

	async sendPushNotification(communication, contactInfo) {
		// In production, integrate with FCM or similar service
		console.log(
			"🔔 Push notification would be sent to device:",
			contactInfo.deviceId
		);
		console.log("Title: Financial Update Available");
		console.log(
			"Body:",
			communication.message.executiveSummary.substring(0, 100)
		);

		return { success: true, messageId: `push_${Date.now()}` };
	}

	async createInAppMessage(communication) {
		// Store message for in-app display
		const inAppMessage = {
			id: `in_app_${Date.now()}`,
			title: "Your Financial Analysis is Ready",
			content: communication.message,
			priority: communication.urgency,
			created: new Date().toISOString(),
			read: false,
		};

		console.log("💬 In-app message created:", inAppMessage.id);
		return { success: true, messageId: inAppMessage.id, message: inAppMessage };
	}

	getCommunicationHistory(limit = 10) {
		return this.communicationHistory.slice(-limit);
	}

	getStatus() {
		return {
			agent: this.agentName,
			status: "active",
			capabilities: [
				"Personalized communication generation",
				"Multi-channel delivery",
				"Motivational content creation",
				"Educational content",
				"Progress updates",
				"Follow-up scheduling",
			],
			deliveryChannels: [
				"Email",
				"SMS",
				"Push notifications",
				"In-app messages",
			],
			communicationHistory: this.communicationHistory.length,
			model: "gemini-2.0-flash-exp",
		};
	}

	// General response method for chat interactions
	async generateResponse(prompt, options = {}) {
		try {
			const systemPrompt = `You are the Communicator Agent of AURA, an AI financial intelligence platform. You excel at:

- **Clear Communication**: Translating complex financial concepts into easy-to-understand language
- **Personalized Messaging**: Adapting communication style to individual user preferences and knowledge levels  
- **Educational Content**: Teaching financial concepts while providing practical advice
- **Motivational Support**: Encouraging users to stay on track with their financial goals
- **Multi-Channel Expertise**: Optimizing messages for different communication channels

Your responses should be:
- Clear, concise, and jargon-free
- Engaging and motivational
- Educational when appropriate
- Personalized to the user's situation
- Action-oriented with specific next steps

Always maintain an encouraging, supportive tone while being professional and trustworthy. Use analogies and examples to make complex topics accessible.`;

			const fullPrompt = `${systemPrompt}\n\nUser Query: ${prompt}\n\nResponse:`;

			const model = this._initializeModel();
			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
				generationConfig: {
					temperature: options.temperature || 0.7,
					maxOutputTokens: options.maxTokens || 400,
					topP: 0.8,
					topK: 40,
				},
			});

			return result.response.text();
		} catch (error) {
			console.error("Communicator response generation error:", error);
			return this._generateFallbackResponse(prompt);
		}
	}

	_generateFallbackResponse(prompt) {
		const lowerPrompt = prompt.toLowerCase();

		if (lowerPrompt.includes("start") || lowerPrompt.includes("begin")) {
			return `Hey there! 👋 Starting your financial journey is exciting!

Think of personal finance like learning to drive - it might seem overwhelming at first, but once you get the basics down, it becomes second nature. Here's your simple roadmap:

💡 **Your First Steps**:
1. **Track Your Money**: Know where every rupee goes (like checking your fuel gauge)
2. **Emergency Fund**: Build a safety net worth 6 months of expenses
3. **Start Investing**: Even ₹500/month in a good mutual fund beats letting money sit idle
4. **Learn as You Go**: You don't need to know everything before starting!

🎯 **Remember**: Every wealthy person started with their first ₹100 investment. The key is starting TODAY, not waiting for the "perfect" moment.

You've got this! What aspect would you like to tackle first? I'm here to guide you every step of the way! 🚀`;
		}

		if (
			lowerPrompt.includes("scared") ||
			lowerPrompt.includes("worried") ||
			lowerPrompt.includes("afraid")
		) {
			return `I totally understand those feelings! 💙 Money matters can feel scary, but you're not alone.

Think of it like learning to swim - the water looks intimidating from the edge, but once you dip your toes in with a good instructor (that's me! 😊), you realize it's not as scary as it seemed.

🤗 **Here's the truth**:
- **Everyone starts as a beginner** - even Warren Buffett made his first investment as a nervous 11-year-old!
- **Small steps are perfect** - Start with just ₹500/month, it's better than ₹0
- **Mistakes are learning opportunities** - I'll help you avoid the common pitfalls
- **Time is your superpower** - Starting young gives you a huge advantage

💪 **You're already ahead** by asking questions and wanting to learn! That's the hardest part done.

Let's start super simple - what's one money goal you have? Even something small like "I want to save ₹10,000 this year" is perfect. We'll build from there, one tiny step at a time! 🌱`;
		}

		return `Hi there! 😊 I'm here to make financial planning feel less like rocket science and more like a friendly chat over coffee!

Whether you're just starting out or looking to optimize your existing investments, I'll break everything down into simple, bite-sized pieces. No confusing jargon, no overwhelming spreadsheets - just clear, practical advice that actually makes sense.

💬 **How I Can Help**:
- **Simplify complex concepts** (like explaining compound interest using a snowball analogy!)
- **Create step-by-step action plans** that fit your lifestyle
- **Keep you motivated** on your wealth-building journey
- **Answer questions** without making you feel silly for asking

🎯 **My Promise**: I'll always give you straight answers in plain English, with real examples you can relate to.

What's on your mind today? Whether it's about investing, saving, planning for goals, or just understanding where to start - I'm here to help! 

Think of me as your financial friend who actually knows what they're talking about! 😉✨`;
	}
}
