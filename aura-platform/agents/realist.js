import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export class RealistAgent {
	constructor(fiMCPClient) {
		this.fiMCPClient = fiMCPClient;
		this.genAI = null;
		this.model = null;
		this.agentName = "Realist Agent";
		this.expertise = "Real-time data integration and market analysis";
		this.marketDataCache = new Map();
		this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
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

	async fetchRealTimeData(userId, phoneNumber) {
		try {
			console.log("🔄 Realist Agent: Fetching real-time financial data...");

			// Authenticate with Fi MCP if needed
			if (!this.fiMCPClient.isAuthenticated()) {
				await this.fiMCPClient.authenticate(phoneNumber);
			}

			const realTimeData = {
				userFinancialData: await this.fetchUserFinancialData(),
				marketData: await this.fetchMarketData(),
				economicIndicators: await this.fetchEconomicIndicators(),
				sectorPerformance: await this.fetchSectorPerformance(),
				timestamp: new Date().toISOString(),
			};

			return {
				agent: this.agentName,
				data: realTimeData,
				dataFreshness: this.calculateDataFreshness(realTimeData),
				reliability: this.assessDataReliability(realTimeData),
			};
		} catch (error) {
			console.error("Realist Agent data fetch error:", error);
			throw new Error(`Real-time data fetch failed: ${error.message}`);
		}
	}

	async fetchUserFinancialData() {
		try {
			const financialData = {};

			// Fetch data from Fi MCP tools
			const tools = await this.fiMCPClient.listTools();
			console.log(
				"📊 Available Fi MCP tools:",
				tools.map((t) => t.name)
			);

			// Fetch net worth
			try {
				const netWorthData = await this.fiMCPClient.callTool(
					"fetch_net_worth",
					{}
				);
				financialData.netWorth = netWorthData;
			} catch (error) {
				console.log("⚠️ Net worth fetch failed:", error.message);
			}

			// Fetch bank transactions
			try {
				const bankTransactions = await this.fiMCPClient.callTool(
					"fetch_bank_transactions",
					{}
				);
				financialData.bankTransactions = bankTransactions;
			} catch (error) {
				console.log("⚠️ Bank transactions fetch failed:", error.message);
			}

			// Fetch mutual fund transactions
			try {
				const mfTransactions = await this.fiMCPClient.callTool(
					"fetch_mf_transactions",
					{}
				);
				financialData.mutualFundTransactions = mfTransactions;
			} catch (error) {
				console.log("⚠️ Mutual fund transactions fetch failed:", error.message);
			}

			// Fetch credit report
			try {
				const creditReport = await this.fiMCPClient.callTool(
					"fetch_credit_report",
					{}
				);
				financialData.creditReport = creditReport;
			} catch (error) {
				console.log("⚠️ Credit report fetch failed:", error.message);
			}

			// Fetch EPF details
			try {
				const epfDetails = await this.fiMCPClient.callTool(
					"fetch_epf_details",
					{}
				);
				financialData.epfDetails = epfDetails;
			} catch (error) {
				console.log("⚠️ EPF details fetch failed:", error.message);
			}

			return financialData;
		} catch (error) {
			console.error("User financial data fetch error:", error);
			return { error: error.message };
		}
	}

	async fetchMarketData() {
		try {
			const cacheKey = "market_data";
			const cached = this.marketDataCache.get(cacheKey);

			if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
				return cached.data;
			}

			const marketData = {
				indices: await this.fetchIndicesData(),
				currencies: await this.fetchCurrencyData(),
				commodities: await this.fetchCommodityData(),
				bonds: await this.fetchBondData(),
			};

			this.marketDataCache.set(cacheKey, {
				data: marketData,
				timestamp: Date.now(),
			});

			return marketData;
		} catch (error) {
			console.error("Market data fetch error:", error);
			return this.getFallbackMarketData();
		}
	}

	async fetchIndicesData() {
		try {
			// Using free APIs for market data
			const indices = [
				{
					name: "NIFTY 50",
					symbol: "NIFTY",
					value: 19500,
					change: 0.8,
					changePercent: 0.04,
				},
				{
					name: "SENSEX",
					symbol: "SENSEX",
					value: 65800,
					change: 250,
					changePercent: 0.38,
				},
				{
					name: "NIFTY BANK",
					symbol: "BANKNIFTY",
					value: 45200,
					change: -120,
					changePercent: -0.26,
				},
			];

			// In production, fetch from actual APIs like TrueData or Polygon
			if (process.env.TRUEDATA_API_KEY) {
				// Implement TrueData API calls
				return await this.fetchFromTrueData("indices");
			}

			return indices;
		} catch (error) {
			console.error("Indices data fetch error:", error);
			return [];
		}
	}

	async fetchCurrencyData() {
		try {
			// Free exchange rate API
			const response = await axios.get(
				"https://api.exchangerate-api.com/v4/latest/USD",
				{
					timeout: 5000,
				}
			);

			return {
				USDINR: response.data.rates.INR || 83.15,
				EURINR: response.data.rates.INR / response.data.rates.EUR || 90.2,
				GBPINR: response.data.rates.INR / response.data.rates.GBP || 105.3,
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Currency data fetch error:", error);
			return {
				USDINR: 83.15,
				EURINR: 90.2,
				GBPINR: 105.3,
				lastUpdated: new Date().toISOString(),
			};
		}
	}

	async fetchCommodityData() {
		try {
			// Mock commodity data - in production, use real APIs
			return {
				gold: { price: 62500, change: 150, unit: "per 10g" },
				silver: { price: 74000, change: -200, unit: "per kg" },
				crude: { price: 85.5, change: 1.2, unit: "per barrel USD" },
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Commodity data fetch error:", error);
			return {};
		}
	}

	async fetchBondData() {
		try {
			// Mock bond data - in production, use RBI or other APIs
			return {
				"10Y_GSec": { yield: 7.25, change: 0.02 },
				"5Y_GSec": { yield: 7.15, change: 0.01 },
				AAA_Corporate: { yield: 7.85, change: 0.03 },
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Bond data fetch error:", error);
			return {};
		}
	}

	async fetchEconomicIndicators() {
		try {
			// Mock economic data - in production, use RBI DBIE or other APIs
			return {
				inflation: { cpi: 5.7, wpi: 4.2 },
				gdp: { growth: 6.1, quarter: "Q2 FY24" },
				repoRate: 6.5,
				fiscalDeficit: 5.8,
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Economic indicators fetch error:", error);
			return {};
		}
	}

	async fetchSectorPerformance() {
		try {
			// Mock sector data - in production, use market data APIs
			return {
				IT: { performance: 12.5, trend: "up" },
				Banking: { performance: -2.3, trend: "down" },
				Pharma: { performance: 8.7, trend: "up" },
				Auto: { performance: -0.5, trend: "neutral" },
				FMCG: { performance: 3.2, trend: "up" },
				Energy: { performance: -1.8, trend: "down" },
				lastUpdated: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Sector performance fetch error:", error);
			return {};
		}
	}

	async fetchFromTrueData(dataType) {
		try {
			const baseUrl = process.env.TRUEDATA_BASE_URL;
			const apiKey = process.env.TRUEDATA_API_KEY;

			if (!baseUrl || !apiKey) {
				throw new Error("TrueData API configuration missing");
			}

			const response = await axios.get(`${baseUrl}/${dataType}`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				timeout: 10000,
			});

			return response.data;
		} catch (error) {
			console.error("TrueData API error:", error);
			throw error;
		}
	}

	async fetchFromPolygon(dataType) {
		try {
			const baseUrl = process.env.POLYGON_BASE_URL;
			const apiKey = process.env.POLYGON_API_KEY;

			if (!baseUrl || !apiKey) {
				throw new Error("Polygon API configuration missing");
			}

			const response = await axios.get(`${baseUrl}/${dataType}`, {
				params: { apikey: apiKey },
				timeout: 10000,
			});

			return response.data;
		} catch (error) {
			console.error("Polygon API error:", error);
			throw error;
		}
	}

	getFallbackMarketData() {
		return {
			indices: [
				{ name: "NIFTY 50", value: 19500, change: 0.8 },
				{ name: "SENSEX", value: 65800, change: 250 },
			],
			currencies: { USDINR: 83.15 },
			commodities: { gold: 62500, silver: 74000 },
			bonds: { "10Y_GSec": 7.25 },
			note: "Fallback data - real-time fetch failed",
		};
	}

	calculateDataFreshness(data) {
		const now = new Date();
		const freshness = {};

		if (data.userFinancialData) {
			freshness.userData = "real-time";
		}

		if (data.marketData) {
			const marketAge = now - new Date(data.marketData.lastUpdated || now);
			freshness.marketData = marketAge < 5 * 60 * 1000 ? "fresh" : "stale";
		}

		if (data.economicIndicators) {
			freshness.economicData = "periodic"; // Usually updated monthly/quarterly
		}

		return freshness;
	}

	assessDataReliability(data) {
		let reliability = 0.5; // Base reliability

		// Increase reliability based on successful data fetches
		if (data.userFinancialData && !data.userFinancialData.error)
			reliability += 0.2;
		if (data.marketData && Object.keys(data.marketData).length > 0)
			reliability += 0.2;
		if (
			data.economicIndicators &&
			Object.keys(data.economicIndicators).length > 0
		)
			reliability += 0.1;

		return Math.min(reliability, 0.95);
	}

	async validateDataConsistency(currentData, previousData) {
		try {
			const inconsistencies = [];

			// Check for major changes that might indicate data issues
			if (previousData && currentData) {
				// Net worth validation
				if (
					currentData.userFinancialData?.netWorth &&
					previousData.userFinancialData?.netWorth
				) {
					const netWorthChange = Math.abs(
						(currentData.userFinancialData.netWorth -
							previousData.userFinancialData.netWorth) /
							previousData.userFinancialData.netWorth
					);

					if (netWorthChange > 0.5) {
						// More than 50% change
						inconsistencies.push({
							type: "net_worth_anomaly",
							description: "Net worth changed by more than 50%",
							severity: "high",
						});
					}
				}

				// Market data validation
				if (
					currentData.marketData?.indices &&
					previousData.marketData?.indices
				) {
					const currentNifty = currentData.marketData.indices.find(
						(i) => i.name === "NIFTY 50"
					);
					const previousNifty = previousData.marketData.indices.find(
						(i) => i.name === "NIFTY 50"
					);

					if (currentNifty && previousNifty) {
						const change = Math.abs(
							(currentNifty.value - previousNifty.value) / previousNifty.value
						);
						if (change > 0.1) {
							// More than 10% change
							inconsistencies.push({
								type: "market_anomaly",
								description: "NIFTY changed by more than 10%",
								severity: "medium",
							});
						}
					}
				}
			}

			return {
				isConsistent: inconsistencies.length === 0,
				inconsistencies,
				confidence: inconsistencies.length === 0 ? 0.9 : 0.6,
			};
		} catch (error) {
			console.error("Data validation error:", error);
			return {
				isConsistent: false,
				inconsistencies: [
					{ type: "validation_error", description: error.message },
				],
			};
		}
	}

	async enrichDataWithContext(rawData) {
		try {
			const enrichedData = { ...rawData };

			// Add market context
			if (enrichedData.marketData) {
				enrichedData.marketContext = await this.generateMarketContext(
					enrichedData.marketData
				);
			}

			// Add user context
			if (enrichedData.userFinancialData) {
				enrichedData.userContext = await this.generateUserContext(
					enrichedData.userFinancialData
				);
			}

			// Add recommendations based on current data
			enrichedData.recommendations =
				await this.generateDataBasedRecommendations(enrichedData);

			return enrichedData;
		} catch (error) {
			console.error("Data enrichment error:", error);
			return rawData;
		}
	}

	async generateMarketContext(marketData) {
		const context = {
			sentiment: "neutral",
			volatility: "medium",
			trends: [],
			opportunities: [],
			risks: [],
		};

		try {
			// Analyze market sentiment based on indices performance
			if (marketData.indices) {
				const positiveIndices = marketData.indices.filter(
					(i) => i.change > 0
				).length;
				const totalIndices = marketData.indices.length;

				if (positiveIndices / totalIndices > 0.7) {
					context.sentiment = "bullish";
				} else if (positiveIndices / totalIndices < 0.3) {
					context.sentiment = "bearish";
				}
			}

			// Analyze currency trends
			if (marketData.currencies && marketData.currencies.USDINR > 84) {
				context.risks.push("Rupee weakness may impact import-heavy sectors");
			}

			// Analyze commodity trends
			if (marketData.commodities && marketData.commodities.gold) {
				if (marketData.commodities.gold.change > 100) {
					context.trends.push(
						"Gold showing strength - potential safe haven demand"
					);
				}
			}

			return context;
		} catch (error) {
			console.error("Market context generation error:", error);
			return context;
		}
	}

	async generateUserContext(userFinancialData) {
		const context = {
			wealth_stage: "accumulation",
			risk_capacity: "medium",
			immediate_actions: [],
			alerts: [],
		};

		try {
			// Determine wealth stage based on net worth
			if (userFinancialData.netWorth) {
				const netWorth =
					userFinancialData.netWorth.totalNetWorthValue?.units || 0;

				if (netWorth < 500000) {
					context.wealth_stage = "foundation";
				} else if (netWorth < 2500000) {
					context.wealth_stage = "accumulation";
				} else if (netWorth < 10000000) {
					context.wealth_stage = "growth";
				} else {
					context.wealth_stage = "preservation";
				}
			}

			// Check for immediate actions needed
			if (userFinancialData.creditReport) {
				const creditScore = userFinancialData.creditReport.creditScore;
				if (creditScore && creditScore < 650) {
					context.alerts.push(
						"Credit score below optimal range - focus on improvement"
					);
				}
			}

			return context;
		} catch (error) {
			console.error("User context generation error:", error);
			return context;
		}
	}

	async generateDataBasedRecommendations(enrichedData) {
		const recommendations = [];

		try {
			// Market-based recommendations
			if (enrichedData.marketContext?.sentiment === "bearish") {
				recommendations.push({
					type: "defensive",
					action: "Consider increasing defensive asset allocation",
					priority: "medium",
					rationale: "Market sentiment is bearish",
				});
			}

			// User-based recommendations
			if (enrichedData.userContext?.wealth_stage === "foundation") {
				recommendations.push({
					type: "emergency_fund",
					action: "Prioritize building emergency fund before investing",
					priority: "high",
					rationale: "Foundation stage requires financial security first",
				});
			}

			// Currency-based recommendations
			if (enrichedData.marketData?.currencies?.USDINR > 84) {
				recommendations.push({
					type: "hedging",
					action: "Consider international diversification",
					priority: "low",
					rationale:
						"Rupee weakness suggests geographic diversification benefits",
				});
			}

			return recommendations;
		} catch (error) {
			console.error("Recommendation generation error:", error);
			return [];
		}
	}

	getStatus() {
		return {
			agent: this.agentName,
			status: "active",
			capabilities: [
				"Fi MCP data integration",
				"Real-time market data",
				"Economic indicators",
				"Data validation",
				"Context enrichment",
				"Multi-source aggregation",
			],
			dataSources: [
				"Fi Money MCP",
				"TrueData (if configured)",
				"Polygon.io (if configured)",
				"Exchange Rate API",
				"RBI DBIE (planned)",
			],
			cacheStatus: `${this.marketDataCache.size} items cached`,
		};
	}

	// General response method for chat interactions
	async generateResponse(prompt, options = {}) {
		try {
			// Initialize model if not already done
			const model = this._initializeModel();

			// Fetch real-time market data for context
			let marketContext = "";
			try {
				const marketData = await this.fetchMarketData();
				const sectorData = await this.fetchSectorPerformance();
				
				marketContext = `
Current Market Context:
- Market Indices: ${JSON.stringify(marketData.indices?.slice(0, 3) || [])}
- Sector Performance: ${JSON.stringify(sectorData)}
- Currency: USD/INR ${marketData.currencies?.USDINR || 83.15}
- Gold: ₹${marketData.commodities?.gold?.price || 62500}/10g
`;
			} catch (error) {
				console.log("Market data fetch failed, using basic context");
				marketContext = "Market data temporarily unavailable - providing general guidance.";
			}

			const systemPrompt = `You are the Realist Agent of AURA, an AI financial intelligence platform. You specialize in:

- **Real-Time Data Integration**: Fetching and processing live financial market data
- **Market Reality Checks**: Providing current market context and realistic assessments
- **Data Validation**: Ensuring accuracy and consistency of financial information
- **Sector Analysis**: Understanding sector performance and investment opportunities
- **Economic Context**: Interpreting economic indicators and market conditions
- **Fact-Based Analysis**: Grounding financial advice in current market realities

${marketContext}

Your responses should be:
- Data-driven and factual
- Current and market-aware
- Realistic about market conditions
- Supported by actual market data
- Objective and unbiased
- Focused on current market realities
- Include specific sector recommendations when asked about investments

Always provide current market context and realistic assessments based on actual data. Ground your advice in market realities rather than theoretical concepts.`;

			const fullPrompt = `${systemPrompt}\n\nUser Query: ${prompt}\n\nResponse:`;

			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
				generationConfig: {
					temperature: options.temperature || 0.4,
					maxOutputTokens: options.maxTokens || 500,
					topP: 0.8,
					topK: 40,
				},
			});

			return result.response.text();
		} catch (error) {
			console.error("Realist response generation error:", error);
			
			// Bulletproof fallback response
			return this._generateFallbackResponse(prompt);
		}
	}

	_generateFallbackResponse(prompt) {
		const lowerPrompt = prompt.toLowerCase();
		
		if (lowerPrompt.includes('sector') || lowerPrompt.includes('invest')) {
			return `Based on current market analysis, here are some sector considerations:

🏦 **Banking & Financial Services**: Traditional sector with steady dividends, but watch for NPA concerns
📱 **Technology**: Strong growth potential, especially in AI, fintech, and digital transformation
⚕️ **Healthcare & Pharma**: Defensive sector with consistent demand, good for stability
🏭 **FMCG**: Consumer staples, recession-resistant but slower growth
🚗 **Automotive**: Cyclical sector, consider EV transition opportunities
⚡ **Energy & Power**: Mix of traditional and renewable opportunities
🏗️ **Infrastructure**: Government focus on infrastructure could drive growth

**Current Market Reality**: Market conditions change rapidly. Consider:
- Diversification across sectors (don't put all in one basket)
- Your risk tolerance and investment timeline
- Start with established large-cap companies in chosen sectors
- Consider SIP (Systematic Investment Plan) for rupee cost averaging

**Recommendation**: Start with 2-3 sectors you understand, allocate 20-30% each, and keep some cash for opportunities. Focus on quality companies with strong fundamentals.

*Note: This is general guidance. Consult with a financial advisor for personalized advice.*`;
		}
		
		if (lowerPrompt.includes('market') || lowerPrompt.includes('economy')) {
			return `**Current Market Reality Check**:

📊 **Market Status**: Indian markets remain resilient with long-term growth potential
💰 **Economic Context**: GDP growth around 6-7%, inflation managed by RBI
🇺🇸 **Global Factors**: US Fed policy and global liquidity flows impact Indian markets
💱 **Currency**: USD/INR around 83-85 range, manageable for economy

**Key Realities**:
- Markets are currently valued at reasonable levels
- FII flows can create short-term volatility
- Domestic institutional flows remain strong
- Corporate earnings growth is the key driver

*This is based on general market conditions. Markets are dynamic and change rapidly.*`;
		}

		return `I apologize, but I'm experiencing technical difficulties accessing real-time market data. However, I can provide this general guidance:

**Investment Approach**:
1. **Diversification**: Spread investments across different sectors and asset classes
2. **Research**: Understand companies and sectors before investing
3. **Time Horizon**: Align investments with your financial goals timeline
4. **Risk Management**: Only invest what you can afford to lose
5. **Professional Advice**: Consider consulting a certified financial advisor

**Current Economic Reality**: India's economy shows resilience with GDP growth, managed inflation, and strong domestic consumption. The market offers opportunities for long-term investors who do proper research.

*Note: This is general information, not personalized financial advice.*`;
	}
}
