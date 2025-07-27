import { v4 as uuidv4 } from "uuid";

export class AgentOrchestrator {
	constructor(agents) {
		this.agents = agents;
		this.sessionId = null;
		this.conversationHistory = [];
		this.maxAgentInteractions =
			parseInt(process.env.MAX_AGENT_INTERACTIONS) || 5;
		this.agentTimeout = parseInt(process.env.AGENT_TIMEOUT_MS) || 30000;
	}

	async analyzePortfolio(userId, phoneNumber, progressCallback = null) {
		try {
			console.log("🎭 Agent Orchestrator: Starting portfolio analysis...");

			// Initialize session
			this.sessionId = `session_${uuidv4()}`;
			const analysisId = `analysis_${uuidv4()}`;

			if (progressCallback) {
				progressCallback({ stage: "Initializing agents", progress: 10 });
			}

			// Step 1: Realist Agent fetches real-time data
			console.log("📊 Step 1: Realist Agent - Fetching real-time data");
			if (progressCallback) {
				progressCallback({ stage: "Fetching financial data", progress: 20 });
			}

			const realistData = await this.executeAgentWithTimeout(
				() => this.agents.realist.fetchRealTimeData(userId, phoneNumber),
				"Realist Agent"
			);

			// Step 2: Quant Agent performs analysis
			console.log("🔢 Step 2: Quant Agent - Performing quantitative analysis");
			if (progressCallback) {
				progressCallback({
					stage: "Performing quantitative analysis",
					progress: 40,
				});
			}

			const quantAnalysis = await this.executeAgentWithTimeout(
				() =>
					this.agents.quant.performQuantitativeAnalysis(
						realistData.data.userFinancialData,
						realistData.data.userFinancialData,
						realistData.data.marketData
					),
				"Quant Agent"
			);

			// Step 3: Strategist Agent creates strategy
			console.log("🎯 Step 3: Strategist Agent - Generating strategy");
			if (progressCallback) {
				progressCallback({
					stage: "Creating financial strategy",
					progress: 60,
				});
			}

			const userProfile = await this.createUserProfile(
				userId,
				realistData.data
			);
			const strategy = await this.executeAgentWithTimeout(
				() =>
					this.agents.strategist.generatePersonalizedPlan(
						userProfile,
						realistData.data.userFinancialData,
						userProfile.goals || []
					),
				"Strategist Agent"
			);

			// Step 4: Agent collaboration and optimization
			console.log("🤝 Step 4: Inter-agent collaboration");
			if (progressCallback) {
				progressCallback({ stage: "Optimizing recommendations", progress: 75 });
			}

			const collaborativeInsights = await this.facilitateAgentCollaboration({
				realist: realistData,
				quant: quantAnalysis,
				strategist: strategy,
			});

			// Step 5: Doer Agent creates action plan
			console.log("✅ Step 5: Doer Agent - Creating action plan");
			if (progressCallback) {
				progressCallback({ stage: "Creating action plan", progress: 85 });
			}

			const actionPlan = await this.executeAgentWithTimeout(
				() =>
					this.agents.doer.createActionPlan(
						strategy,
						quantAnalysis,
						userProfile
					),
				"Doer Agent"
			);

			// Step 6: Communicator Agent prepares communication
			console.log("💬 Step 6: Communicator Agent - Preparing communication");
			if (progressCallback) {
				progressCallback({ stage: "Preparing communication", progress: 95 });
			}

			const communication = await this.executeAgentWithTimeout(
				() =>
					this.agents.communicator.generateUserCommunication(
						{ quantAnalysis, collaborativeInsights },
						actionPlan,
						userProfile,
						userProfile.communicationPreferences || {}
					),
				"Communicator Agent"
			);

			// Compile final analysis
			const finalAnalysis = {
				analysisId,
				sessionId: this.sessionId,
				userId,
				phoneNumber,
				timestamp: new Date().toISOString(),
				status: "completed",
				data: {
					realTimeData: realistData,
					quantitativeAnalysis: quantAnalysis,
					strategy: strategy,
					actionPlan: actionPlan,
					communication: communication,
					collaborativeInsights: collaborativeInsights,
				},
				summary: this.generateAnalysisSummary({
					realistData,
					quantAnalysis,
					strategy,
					actionPlan,
				}),
				confidence: this.calculateOverallConfidence({
					realistData,
					quantAnalysis,
					strategy,
				}),
			};

			if (progressCallback) {
				progressCallback({ stage: "Analysis complete", progress: 100 });
			}

			// Store analysis in conversation history
			this.conversationHistory.push({
				type: "analysis",
				data: finalAnalysis,
				timestamp: new Date().toISOString(),
			});

			console.log("✅ Portfolio analysis completed successfully");
			return finalAnalysis;
		} catch (error) {
			console.error("❌ Portfolio analysis failed:", error);

			if (progressCallback) {
				progressCallback({
					stage: "Analysis failed",
					progress: 0,
					error: error.message,
				});
			}

			throw new Error(`Portfolio analysis failed: ${error.message}`);
		}
	}

	async facilitateAgentCollaboration(agentOutputs) {
		try {
			console.log("🤝 Facilitating inter-agent collaboration...");

			const collaborationRounds = [];

			// Round 1: Strategist incorporates Quant insights
			console.log("🔄 Collaboration Round 1: Strategist + Quant");
			const strategistOptimization =
				await this.agents.strategist.collaborateWithAgents({
					quant: agentOutputs.quant.insights,
					realist: agentOutputs.realist.data,
				});

			collaborationRounds.push({
				round: 1,
				type: "strategist_optimization",
				output: strategistOptimization,
			});

			// Round 2: Quant validates strategy with updated market data
			console.log("🔄 Collaboration Round 2: Quant validation");
			const quantValidation = await this.agents.quant.generateQuantInsights(
				agentOutputs.quant.metrics,
				{
					...agentOutputs.realist.data.marketData,
					strategyContext: strategistOptimization.collaborativeStrategy,
				}
			);

			collaborationRounds.push({
				round: 2,
				type: "quant_validation",
				output: quantValidation,
			});

			// Round 3: Cross-agent consensus building
			const consensus = await this.buildConsensus(
				agentOutputs,
				collaborationRounds
			);

			return {
				collaborationRounds,
				consensus,
				timestamp: new Date().toISOString(),
				convergenceScore: this.calculateConvergenceScore(collaborationRounds),
			};
		} catch (error) {
			console.error("Agent collaboration error:", error);
			return {
				collaborationRounds: [],
				consensus: "Limited collaboration due to error",
				error: error.message,
			};
		}
	}

	async buildConsensus(agentOutputs, collaborationRounds) {
		try {
			// Analyze agreement across agents
			const consensusPoints = [];
			const conflictPoints = [];

			// Extract key recommendations from each agent
			const recommendations = {
				strategist: this.extractRecommendations(agentOutputs.strategist),
				quant: this.extractRecommendations(agentOutputs.quant),
				realist: this.extractRecommendations(agentOutputs.realist),
			};

			// Find common themes
			const themes = this.findCommonThemes(recommendations);

			themes.forEach((theme) => {
				const agentCount = Object.keys(theme.supportingAgents).length;
				if (agentCount >= 2) {
					consensusPoints.push({
						theme: theme.topic,
						confidence: theme.confidence,
						supportingAgents: theme.supportingAgents,
						recommendation: theme.recommendation,
					});
				} else {
					conflictPoints.push({
						theme: theme.topic,
						conflictingViews: theme.conflictingViews,
					});
				}
			});

			return {
				consensusPoints,
				conflictPoints,
				overallAgreement:
					consensusPoints.length /
					(consensusPoints.length + conflictPoints.length),
				finalRecommendation:
					this.synthesizeFinalRecommendation(consensusPoints),
			};
		} catch (error) {
			console.error("Consensus building error:", error);
			return {
				consensusPoints: [],
				conflictPoints: [],
				overallAgreement: 0.5,
				finalRecommendation: "Continue with balanced approach",
			};
		}
	}

	extractRecommendations(agentOutput) {
		const recommendations = [];

		try {
			if (agentOutput.strategy) {
				// Extract from strategy (Strategist)
				const strategy = agentOutput.strategy;
				if (typeof strategy === "string") {
					recommendations.push({
						type: "strategy",
						content: strategy,
						confidence: 0.8,
					});
				} else if (strategy.recommendations) {
					strategy.recommendations.forEach((rec) => {
						recommendations.push({
							type: "strategy",
							content: rec,
							confidence: 0.8,
						});
					});
				}
			}

			if (agentOutput.insights) {
				// Extract from insights (Quant)
				recommendations.push({
					type: "quantitative",
					content: agentOutput.insights.analysis,
					confidence: 0.9,
				});
			}

			if (agentOutput.data && agentOutput.data.recommendations) {
				// Extract from data (Realist)
				agentOutput.data.recommendations.forEach((rec) => {
					recommendations.push({
						type: "market_based",
						content: rec.action,
						confidence: 0.7,
					});
				});
			}
		} catch (error) {
			console.error("Recommendation extraction error:", error);
		}

		return recommendations;
	}

	findCommonThemes(recommendations) {
		const themes = [];
		const keywords = [
			"diversify",
			"risk",
			"emergency",
			"debt",
			"goal",
			"allocation",
			"invest",
			"save",
		];

		keywords.forEach((keyword) => {
			const theme = {
				topic: keyword,
				supportingAgents: {},
				conflictingViews: [],
				confidence: 0,
				recommendation: "",
			};

			Object.entries(recommendations).forEach(([agent, recs]) => {
				const relevantRecs = recs.filter((rec) =>
					rec.content.toLowerCase().includes(keyword)
				);

				if (relevantRecs.length > 0) {
					theme.supportingAgents[agent] = relevantRecs;
					theme.confidence +=
						relevantRecs.reduce((sum, rec) => sum + rec.confidence, 0) /
						relevantRecs.length;
				}
			});

			if (Object.keys(theme.supportingAgents).length > 0) {
				theme.confidence =
					theme.confidence / Object.keys(theme.supportingAgents).length;
				theme.recommendation = this.synthesizeThemeRecommendation(theme);
				themes.push(theme);
			}
		});

		return themes;
	}

	synthesizeThemeRecommendation(theme) {
		const agentInputs = Object.values(theme.supportingAgents).flat();

		// Simple synthesis - in production, could use AI to create coherent recommendation
		if (agentInputs.length > 0) {
			return agentInputs[0].content;
		}

		return `Consider ${theme.topic} optimization based on agent analysis`;
	}

	synthesizeFinalRecommendation(consensusPoints) {
		if (consensusPoints.length === 0) {
			return "Continue monitoring your portfolio and maintain diversified approach";
		}

		const topRecommendations = consensusPoints
			.sort((a, b) => b.confidence - a.confidence)
			.slice(0, 3)
			.map((point) => point.recommendation);

		return topRecommendations.join("; ");
	}

	calculateConvergenceScore(collaborationRounds) {
		if (collaborationRounds.length === 0) return 0;

		// Simple convergence metric - in production, could be more sophisticated
		let score = 0.5;

		collaborationRounds.forEach((round) => {
			if (round.output && !round.output.error) {
				score += 0.2;
			}
		});

		return Math.min(score, 1.0);
	}

	async executeAgentWithTimeout(agentFunction, agentName) {
		try {
			console.log(
				`⏰ Executing ${agentName} with timeout: ${this.agentTimeout}ms`
			);

			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error(`${agentName} timeout after ${this.agentTimeout}ms`)
						),
					this.agentTimeout
				);
			});

			const result = await Promise.race([agentFunction(), timeoutPromise]);

			console.log(`✅ ${agentName} completed successfully`);
			return result;
		} catch (error) {
			console.error(`❌ ${agentName} failed:`, error.message);
			throw new Error(`${agentName} execution failed: ${error.message}`);
		}
	}

	async createUserProfile(userId, realistData) {
		try {
			const profile = {
				userId,
				goals: [
					{
						name: "Retirement Planning",
						target: 10000000,
						timeline: "20 years",
					},
					{ name: "Emergency Fund", target: 500000, timeline: "6 months" },
				],
				riskProfile: "medium",
				age: 30,
				income: 1200000,
				communicationPreferences: {
					preferredChannel: "app",
					frequency: "weekly",
				},
			};

			// Enhance profile with real data if available
			if (realistData.userFinancialData) {
				const netWorth =
					realistData.userFinancialData.netWorth?.totalNetWorthValue?.units;
				if (netWorth) {
					// Adjust risk profile based on net worth
					if (netWorth > 5000000) profile.riskProfile = "high";
					else if (netWorth < 1000000) profile.riskProfile = "low";
				}
			}

			return profile;
		} catch (error) {
			console.error("User profile creation error:", error);
			return {
				userId,
				goals: [],
				riskProfile: "medium",
				communicationPreferences: {},
			};
		}
	}

	generateAnalysisSummary(analysisData) {
		try {
			const summary = {
				financialHealth: "Good",
				keyInsights: [],
				topRecommendations: [],
				riskLevel: "Medium",
				confidence: 0.8,
			};

			// Extract key insights
			if (analysisData.quantAnalysis?.metrics) {
				const metrics = analysisData.quantAnalysis.metrics;

				if (metrics.netWorth) {
					summary.keyInsights.push(
						`Net Worth: ₹${metrics.netWorth.toLocaleString("en-IN")}`
					);
				}

				if (metrics.xirr) {
					summary.keyInsights.push(
						`Portfolio XIRR: ${metrics.xirr.toFixed(2)}%`
					);
				}

				if (metrics.volatility) {
					summary.keyInsights.push(
						`Portfolio Volatility: ${metrics.volatility.toFixed(2)}%`
					);
				}
			}

			// Extract top recommendations
			if (analysisData.actionPlan?.immediate) {
				analysisData.actionPlan.immediate.slice(0, 3).forEach((action) => {
					summary.topRecommendations.push(action.title);
				});
			}

			// Determine financial health
			if (analysisData.quantAnalysis?.riskAnalysis) {
				summary.riskLevel = analysisData.quantAnalysis.riskAnalysis.overallRisk;

				if (summary.riskLevel === "Low") summary.financialHealth = "Excellent";
				else if (summary.riskLevel === "High")
					summary.financialHealth = "Needs Attention";
			}

			return summary;
		} catch (error) {
			console.error("Summary generation error:", error);
			return {
				financialHealth: "Unknown",
				keyInsights: ["Analysis completed"],
				topRecommendations: ["Review portfolio"],
				riskLevel: "Medium",
				confidence: 0.5,
			};
		}
	}

	calculateOverallConfidence(analysisData) {
		try {
			let totalConfidence = 0;
			let weightedSum = 0;

			// Weight different components
			const weights = {
				realist: 0.3,
				quant: 0.3,
				strategist: 0.4,
			};

			if (analysisData.realistData?.reliability) {
				totalConfidence +=
					analysisData.realistData.reliability * weights.realist;
				weightedSum += weights.realist;
			}

			if (analysisData.quantAnalysis?.confidence) {
				totalConfidence +=
					analysisData.quantAnalysis.confidence * weights.quant;
				weightedSum += weights.quant;
			}

			if (analysisData.strategy?.confidence) {
				totalConfidence +=
					analysisData.strategy.confidence * weights.strategist;
				weightedSum += weights.strategist;
			}

			return weightedSum > 0 ? totalConfidence / weightedSum : 0.5;
		} catch (error) {
			console.error("Confidence calculation error:", error);
			return 0.5;
		}
	}

	async getRecommendations(params) {
		try {
			const { userId, phoneNumber, riskProfile, goals } = params;

			// Quick recommendations without full analysis
			const realistData = await this.agents.realist.fetchRealTimeData(
				userId,
				phoneNumber
			);
			const userProfile = { userId, riskProfile, goals };

			const quickStrategy =
				await this.agents.strategist.generatePersonalizedPlan(
					userProfile,
					realistData.data.userFinancialData,
					goals
				);

			return {
				recommendations: quickStrategy,
				timestamp: new Date().toISOString(),
				type: "quick_recommendations",
			};
		} catch (error) {
			console.error("Quick recommendations error:", error);
			throw new Error(`Recommendations generation failed: ${error.message}`);
		}
	}

	getAgentStatus() {
		const status = {};

		Object.entries(this.agents).forEach(([name, agent]) => {
			try {
				status[name] = agent.getStatus();
			} catch (error) {
				status[name] = { status: "error", error: error.message };
			}
		});

		return {
			orchestrator: {
				status: "active",
				sessionId: this.sessionId,
				conversationHistory: this.conversationHistory.length,
				maxInteractions: this.maxAgentInteractions,
				timeout: this.agentTimeout,
			},
			agents: status,
		};
	}

	getConversationHistory() {
		return this.conversationHistory;
	}

	clearSession() {
		this.sessionId = null;
		this.conversationHistory = [];
		console.log("🔄 Orchestrator session cleared");
	}
}
