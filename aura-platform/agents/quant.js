import { GoogleGenerativeAI } from "@google/generative-ai";
import { create, all } from "mathjs";
import dotenv from "dotenv";

dotenv.config();

const math = create(all);

export class QuantAgent {
	constructor() {
		this.genAI = null;
		this.model = null;
		this.agentName = "Quant Agent";
		this.expertise = "Quantitative financial analysis";
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

	async performQuantitativeAnalysis(financialData, portfolioData, marketData) {
		try {
			// Calculate key financial metrics
			const metrics = await this.calculateFinancialMetrics(
				financialData,
				portfolioData
			);

			// Generate AI-powered insights
			const insights = await this.generateQuantInsights(metrics, marketData);

			return {
				agent: this.agentName,
				metrics,
				insights,
				riskAnalysis: this.calculateRiskMetrics(portfolioData),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Quant analysis error:", error);
			throw new Error(`Quantitative analysis failed: ${error.message}`);
		}
	}

	async calculateFinancialMetrics(financialData, portfolioData) {
		const metrics = {};

		try {
			// Net Worth calculation
			if (financialData.assets && financialData.liabilities) {
				metrics.netWorth = this.calculateNetWorth(
					financialData.assets,
					financialData.liabilities
				);
			}

			// Portfolio metrics
			if (portfolioData && portfolioData.investments) {
				metrics.xirr = await this.calculateXIRR(portfolioData.investments);
				metrics.cagr = await this.calculateCAGR(portfolioData.investments);
				metrics.volatility = this.calculateVolatility(
					portfolioData.investments
				);
				metrics.sharpeRatio = this.calculateSharpeRatio(
					portfolioData.investments
				);
				metrics.maxDrawdown = this.calculateMaxDrawdown(
					portfolioData.investments
				);
			}

			// Asset allocation
			if (portfolioData && portfolioData.assets) {
				metrics.assetAllocation = this.calculateAssetAllocation(
					portfolioData.assets
				);
				metrics.diversificationRatio = this.calculateDiversification(
					portfolioData.assets
				);
			}

			// Debt metrics
			if (financialData.liabilities) {
				metrics.debtToIncomeRatio =
					this.calculateDebtToIncomeRatio(financialData);
				metrics.creditUtilization =
					this.calculateCreditUtilization(financialData);
			}

			return metrics;
		} catch (error) {
			console.error("Metrics calculation error:", error);
			return { error: error.message };
		}
	}

	calculateNetWorth(assets, liabilities) {
		const totalAssets = assets.reduce(
			(sum, asset) => sum + (asset.value || 0),
			0
		);
		const totalLiabilities = liabilities.reduce(
			(sum, liability) => sum + (liability.value || 0),
			0
		);
		return totalAssets - totalLiabilities;
	}

	async calculateXIRR(investments) {
		try {
			if (!investments || investments.length === 0) return null;

			// Simplified XIRR calculation using Newton-Raphson method
			const cashFlows = investments.map((inv) => ({
				date: new Date(inv.date),
				amount: inv.type === "investment" ? -inv.amount : inv.amount,
			}));

			// Sort by date
			cashFlows.sort((a, b) => a.date - b.date);

			// Implement XIRR calculation
			let rate = 0.1; // Initial guess
			const tolerance = 0.0001;
			const maxIterations = 100;

			for (let i = 0; i < maxIterations; i++) {
				const { npv, derivative } = this.calculateNPVAndDerivative(
					cashFlows,
					rate
				);

				if (Math.abs(npv) < tolerance) break;

				const newRate = rate - npv / derivative;
				if (Math.abs(newRate - rate) < tolerance) break;

				rate = newRate;
			}

			return rate * 100; // Return as percentage
		} catch (error) {
			console.error("XIRR calculation error:", error);
			return null;
		}
	}

	calculateNPVAndDerivative(cashFlows, rate) {
		const baseDate = cashFlows[0].date;
		let npv = 0;
		let derivative = 0;

		for (const cf of cashFlows) {
			const years = (cf.date - baseDate) / (365.25 * 24 * 60 * 60 * 1000);
			const discountFactor = Math.pow(1 + rate, -years);

			npv += cf.amount * discountFactor;
			derivative -= (cf.amount * years * discountFactor) / (1 + rate);
		}

		return { npv, derivative };
	}

	async calculateCAGR(investments) {
		try {
			if (!investments || investments.length < 2) return null;

			const sortedInvestments = investments.sort(
				(a, b) => new Date(a.date) - new Date(b.date)
			);
			const firstInvestment = sortedInvestments[0];
			const lastInvestment = sortedInvestments[sortedInvestments.length - 1];

			const beginningValue = firstInvestment.amount;
			const endingValue = lastInvestment.currentValue || lastInvestment.amount;
			const years =
				(new Date(lastInvestment.date) - new Date(firstInvestment.date)) /
				(365.25 * 24 * 60 * 60 * 1000);

			if (years <= 0 || beginningValue <= 0) return null;

			const cagr = Math.pow(endingValue / beginningValue, 1 / years) - 1;
			return cagr * 100; // Return as percentage
		} catch (error) {
			console.error("CAGR calculation error:", error);
			return null;
		}
	}

	calculateVolatility(investments) {
		try {
			if (!investments || investments.length < 2) return null;

			const returns = [];
			for (let i = 1; i < investments.length; i++) {
				const prevValue =
					investments[i - 1].currentValue || investments[i - 1].amount;
				const currentValue =
					investments[i].currentValue || investments[i].amount;

				if (prevValue > 0) {
					returns.push((currentValue - prevValue) / prevValue);
				}
			}

			if (returns.length === 0) return null;

			const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
			const variance =
				returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
				returns.length;

			return Math.sqrt(variance * 252) * 100; // Annualized volatility as percentage
		} catch (error) {
			console.error("Volatility calculation error:", error);
			return null;
		}
	}

	calculateSharpeRatio(investments, riskFreeRate = 0.06) {
		try {
			const cagr = this.calculateCAGR(investments);
			const volatility = this.calculateVolatility(investments);

			if (cagr === null || volatility === null || volatility === 0) return null;

			return (cagr / 100 - riskFreeRate) / (volatility / 100);
		} catch (error) {
			console.error("Sharpe ratio calculation error:", error);
			return null;
		}
	}

	calculateMaxDrawdown(investments) {
		try {
			if (!investments || investments.length < 2) return null;

			let maxDrawdown = 0;
			let peak = investments[0].currentValue || investments[0].amount;

			for (const investment of investments) {
				const currentValue = investment.currentValue || investment.amount;

				if (currentValue > peak) {
					peak = currentValue;
				}

				const drawdown = (peak - currentValue) / peak;
				if (drawdown > maxDrawdown) {
					maxDrawdown = drawdown;
				}
			}

			return maxDrawdown * 100; // Return as percentage
		} catch (error) {
			console.error("Max drawdown calculation error:", error);
			return null;
		}
	}

	calculateAssetAllocation(assets) {
		try {
			const totalValue = assets.reduce(
				(sum, asset) => sum + (asset.value || 0),
				0
			);

			if (totalValue === 0) return {};

			const allocation = {};
			for (const asset of assets) {
				const category = asset.category || asset.type || "Other";
				if (!allocation[category]) allocation[category] = 0;
				allocation[category] += ((asset.value || 0) / totalValue) * 100;
			}

			return allocation;
		} catch (error) {
			console.error("Asset allocation calculation error:", error);
			return {};
		}
	}

	calculateDiversification(assets) {
		try {
			const allocation = this.calculateAssetAllocation(assets);
			const categories = Object.keys(allocation);

			if (categories.length === 0) return 0;

			// Calculate Herfindahl-Hirschman Index for diversification
			const hhi = categories.reduce((sum, category) => {
				const weight = allocation[category] / 100;
				return sum + weight * weight;
			}, 0);

			// Convert to diversification ratio (1 = perfectly diversified, 0 = concentrated)
			const maxDiversification = 1 / categories.length;
			return (1 - hhi) / (1 - maxDiversification);
		} catch (error) {
			console.error("Diversification calculation error:", error);
			return 0;
		}
	}

	calculateDebtToIncomeRatio(financialData) {
		try {
			const monthlyIncome = financialData.income?.monthly || 0;
			const monthlyDebtPayments =
				financialData.liabilities?.reduce((sum, liability) => {
					return sum + (liability.monthlyPayment || 0);
				}, 0) || 0;

			if (monthlyIncome === 0) return null;
			return (monthlyDebtPayments / monthlyIncome) * 100;
		} catch (error) {
			console.error("Debt-to-income calculation error:", error);
			return null;
		}
	}

	calculateCreditUtilization(financialData) {
		try {
			const creditCards =
				financialData.liabilities?.filter((l) => l.type === "credit_card") ||
				[];

			const totalUsed = creditCards.reduce(
				(sum, card) => sum + (card.currentBalance || 0),
				0
			);
			const totalLimit = creditCards.reduce(
				(sum, card) => sum + (card.creditLimit || 0),
				0
			);

			if (totalLimit === 0) return null;
			return (totalUsed / totalLimit) * 100;
		} catch (error) {
			console.error("Credit utilization calculation error:", error);
			return null;
		}
	}

	calculateRiskMetrics(portfolioData) {
		try {
			const riskMetrics = {
				overallRisk: "Medium", // Default
				riskScore: 50, // 0-100 scale
				recommendations: [],
			};

			if (portfolioData && portfolioData.investments) {
				const volatility = this.calculateVolatility(portfolioData.investments);
				const sharpeRatio = this.calculateSharpeRatio(
					portfolioData.investments
				);
				const maxDrawdown = this.calculateMaxDrawdown(
					portfolioData.investments
				);

				// Calculate risk score based on metrics
				let riskScore = 50;

				if (volatility !== null) {
					if (volatility > 25) riskScore += 20;
					else if (volatility > 15) riskScore += 10;
					else if (volatility < 8) riskScore -= 10;
				}

				if (sharpeRatio !== null) {
					if (sharpeRatio > 1.5) riskScore -= 15;
					else if (sharpeRatio > 1) riskScore -= 10;
					else if (sharpeRatio < 0.5) riskScore += 15;
				}

				if (maxDrawdown !== null) {
					if (maxDrawdown > 30) riskScore += 25;
					else if (maxDrawdown > 20) riskScore += 15;
					else if (maxDrawdown < 10) riskScore -= 10;
				}

				riskMetrics.riskScore = Math.max(0, Math.min(100, riskScore));

				// Determine overall risk level
				if (riskMetrics.riskScore > 70) riskMetrics.overallRisk = "High";
				else if (riskMetrics.riskScore > 40) riskMetrics.overallRisk = "Medium";
				else riskMetrics.overallRisk = "Low";

				// Generate recommendations
				if (volatility > 20) {
					riskMetrics.recommendations.push(
						"Consider diversifying to reduce portfolio volatility"
					);
				}
				if (sharpeRatio < 0.8) {
					riskMetrics.recommendations.push(
						"Portfolio returns may not justify the risk taken"
					);
				}
				if (maxDrawdown > 25) {
					riskMetrics.recommendations.push(
						"Consider adding defensive assets to reduce drawdown risk"
					);
				}
			}

			return riskMetrics;
		} catch (error) {
			console.error("Risk metrics calculation error:", error);
			return { overallRisk: "Unknown", riskScore: 50, recommendations: [] };
		}
	}

	async generateQuantInsights(metrics, marketData) {
		try {
			const prompt = `
As the Quant Agent, analyze these financial metrics and provide data-driven insights:

Financial Metrics:
${JSON.stringify(metrics, null, 2)}

Market Data:
${JSON.stringify(marketData, null, 2)}

Provide quantitative insights including:
1. Performance analysis compared to benchmarks
2. Risk-adjusted return evaluation
3. Portfolio optimization suggestions
4. Statistical significance of trends
5. Quantitative recommendations for improvement
6. Mathematical projections and scenarios

Focus on numerical analysis and statistical conclusions. Be precise with calculations and avoid speculation.
`;

			const model = this._initializeModel();
			const result = await model.generateContent(prompt);
			const response = await result.response;

			return {
				analysis: response.text(),
				confidence: this.calculateAnalysisConfidence(metrics),
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			console.error("Quant insights error:", error);
			return { analysis: "Analysis unavailable", confidence: 0 };
		}
	}

	calculateAnalysisConfidence(metrics) {
		let confidence = 0.3; // Base confidence

		// Increase confidence based on available metrics
		Object.keys(metrics).forEach((key) => {
			if (metrics[key] !== null && metrics[key] !== undefined) {
				confidence += 0.1;
			}
		});

		return Math.min(confidence, 0.95);
	}

	getStatus() {
		return {
			agent: this.agentName,
			status: "active",
			capabilities: [
				"XIRR calculation",
				"CAGR analysis",
				"Volatility measurement",
				"Sharpe ratio calculation",
				"Risk metrics",
				"Portfolio optimization",
				"Statistical analysis",
			],
			model: "gemini-2.0-flash-exp",
		};
	}

	// General response method for chat interactions
	async generateResponse(prompt, options = {}) {
		try {
			const systemPrompt = `You are the Quant Agent of AURA, an AI financial intelligence platform. You specialize in:

- **Quantitative Analysis**: Mathematical and statistical analysis of financial data
- **Performance Metrics**: XIRR, CAGR, Sharpe ratio, alpha, beta calculations
- **Risk Assessment**: Volatility, standard deviation, maximum drawdown analysis
- **Portfolio Optimization**: Mathematical optimization of asset allocations
- **Statistical Modeling**: Using statistical methods to predict and analyze financial patterns
- **Data Interpretation**: Converting complex numbers into actionable insights

Your responses should be:
- Mathematically precise and data-driven
- Supported by specific calculations and metrics
- Clear explanations of quantitative concepts
- Risk-focused with statistical backing
- Practical applications of mathematical insights

Always provide numerical evidence for your conclusions and explain the significance of mathematical results in practical terms.`;

			const fullPrompt = `${systemPrompt}\n\nUser Query: ${prompt}\n\nResponse:`;

			const model = this._initializeModel();
			const result = await model.generateContent({
				contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
				generationConfig: {
					temperature: options.temperature || 0.3,
					maxOutputTokens: options.maxTokens || 350,
					topP: 0.8,
					topK: 40,
				},
			});

			return result.response.text();
		} catch (error) {
			console.error("Quant response generation error:", error);
			return this._generateFallbackResponse(prompt);
		}
	}

	_generateFallbackResponse(prompt) {
		const lowerPrompt = prompt.toLowerCase();
		
		if (lowerPrompt.includes('risk') || lowerPrompt.includes('volatility')) {
			return `**Quantitative Risk Analysis**:

📊 **Risk Metrics to Monitor**:
- **Standard Deviation**: Measures portfolio volatility (lower = less risky)
- **Sharpe Ratio**: Risk-adjusted returns (higher = better risk-reward)
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Beta**: Sensitivity to market movements (1.0 = market level risk)

📈 **Portfolio Risk Assessment**:
- **Conservative**: 15-25% annual volatility
- **Moderate**: 25-35% annual volatility  
- **Aggressive**: 35%+ annual volatility

🔢 **Risk Management Numbers**:
- Diversify across 15-20 stocks minimum
- Limit single stock exposure to 5-10%
- Maintain correlation below 0.7 between holdings
- Target Sharpe ratio above 0.5

💡 **Quantitative Insights**:
Risk and return are mathematically linked. Higher returns typically require accepting higher volatility. The key is optimizing the risk-return trade-off through proper diversification and position sizing.

*Note: These are general quantitative guidelines. Actual risk calculations require specific portfolio data.*`;
		}
		
		if (lowerPrompt.includes('return') || lowerPrompt.includes('performance')) {
			return `**Quantitative Performance Analysis**:

📊 **Key Performance Metrics**:
- **XIRR**: Extended Internal Rate of Return (accounts for irregular cash flows)
- **CAGR**: Compound Annual Growth Rate (simple annual growth measure)
- **Alpha**: Excess return above market benchmark
- **Information Ratio**: Active return per unit of active risk

📈 **Benchmark Comparisons**:
- **Nifty 50**: Historical CAGR ~12-15%
- **Large Cap Equity**: Target CAGR 12-18%
- **Mid Cap Equity**: Target CAGR 15-20%
- **Debt Funds**: Target returns 6-9%

🔢 **Performance Calculation**:
- Track returns over multiple time periods (1Y, 3Y, 5Y+)
- Use XIRR for SIP investments with regular contributions
- Compare against relevant benchmarks, not just absolute returns
- Factor in inflation (real returns = nominal returns - inflation)

💡 **Mathematical Reality**:
Past performance doesn't guarantee future results, but consistent metrics over 3-5 years provide statistically meaningful insight into fund/portfolio quality.

*These calculations require actual investment data for precise analysis.*`;
		}

		return `**Quantitative Financial Analysis**:

🔢 **Mathematical Approach to Investing**:

📊 **Key Metrics to Track**:
- **Returns**: CAGR, XIRR for time-weighted analysis
- **Risk**: Standard deviation, maximum drawdown
- **Efficiency**: Sharpe ratio, Sortino ratio
- **Correlation**: Portfolio diversification effectiveness

📈 **Statistical Insights**:
- Markets show mean reversion over long periods
- Diversification mathematically reduces portfolio risk
- Systematic investing (SIP) reduces timing risk through averaging
- Compound growth accelerates exponentially over time

💡 **Quantitative Guidelines**:
- Aim for Sharpe ratio > 0.5 (risk-adjusted returns)
- Maintain portfolio correlation < 0.7 between major holdings
- Target 15-20% annual volatility for balanced portfolios
- Review performance over rolling 3-year periods minimum

🎯 **Mathematical Principles**:
Successful investing follows mathematical principles: diversification, compounding, and statistical probability. Focus on evidence-based metrics rather than emotions or short-term noise.

*These principles apply universally but require specific data for precise calculations.*`;
	}
}
