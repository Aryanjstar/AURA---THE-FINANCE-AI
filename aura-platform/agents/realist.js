/**
 * Realist Agent - Real-Time Market Data Integration
 * Fetches and validates live market data for grounded financial decisions
 * 
 * OpenAI x NxtWave Buildathon
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { openaiService } from "../services/openai-service.js";
import { marketDataService } from "../services/market-data-service.js";
import { logger } from "../services/logger.js";
import dotenv from "dotenv";

dotenv.config();

export class RealistAgent {
	constructor(fiMCPClient) {
        this.name = "Realist";
        this.icon = "📈";
		this.fiMCPClient = fiMCPClient;
        this.model = null;
		this.genAI = null;
        this.useOpenAI = openaiService.isAvailable();
        
        if (!this.useOpenAI && process.env.GEMINI_API_KEY) {
			this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        
        logger.agent('REALIST', `Initialized (Using ${this.useOpenAI ? 'OpenAI' : 'Gemini'})`);
    }

    async _initializeModel() {
        if (!this.model && this.genAI) {
            this.model = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.85,
                    maxOutputTokens: 2048,
                },
            });
        }
    }

    async generateResponse(prompt) {
        try {
            logger.agent('REALIST', 'Generating market-grounded response...');

            // Get current market data
            const marketData = await marketDataService.getMarketOverview();

            const systemPrompt = `You are a Market Realist AI agent specializing in Indian financial markets.

CURRENT MARKET DATA:
- Nifty 50: ${marketData.indices?.[0]?.value || 'N/A'} (${marketData.indices?.[0]?.changePercent || 0}%)
- Sensex: ${marketData.indices?.[1]?.value || 'N/A'}
- Market Status: ${marketData.marketStatus?.status || 'Unknown'}
- USD/INR: ${marketData.currencies?.USDINR || 83.5}

Your role:
1. Ground all advice in current market reality
2. Provide context about Indian market conditions
3. Highlight relevant economic indicators
4. Identify opportunities and risks in current environment
5. Be data-driven and factual

Always reference actual market data and Indian economic context.`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ], { temperature: 0.4 });
                
                logger.success('REALIST response generated via OpenAI');
                return response;
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(`${systemPrompt}\n\nQuery: ${prompt}`);
                logger.success('REALIST response generated via Gemini');
                return result.response.text();
            }

            return this._getFallbackResponse(prompt);
		} catch (error) {
            logger.error('REALIST error', error);
            return this._getFallbackResponse(prompt);
        }
    }

    async fetchRealTimeData(phoneNumber) {
        try {
            logger.agent('REALIST', 'Fetching real-time financial data...');

            // Fetch user financial data via Fi MCP
            let userFinancialData = null;
            if (this.fiMCPClient) {
                try {
                    userFinancialData = await this.fiMCPClient.fetchAllFinancialData(phoneNumber);
                    logger.success('User financial data fetched', {
                        hasNetWorth: !!userFinancialData?.netWorth,
                        hasTransactions: !!userFinancialData?.transactions,
                        hasMutualFunds: !!userFinancialData?.mutualFunds
                    });
		} catch (error) {
                    logger.warn('Fi MCP data fetch failed', { error: error.message });
                }
            }

            // Fetch market data
            const marketData = await marketDataService.getMarketOverview();
            
            // Fetch economic indicators
            const economicData = await marketDataService.fetchEconomicIndicators();
            
            // Fetch sector performance
            const sectorData = await marketDataService.fetchSectorPerformance();

            // Assess data freshness
            const dataFreshness = this.assessDataFreshness(userFinancialData, marketData);
            
            // Validate data consistency
            const dataConsistency = this.validateDataConsistency(userFinancialData);

            const realTimeData = {
                userFinancialData: this.enrichUserData(userFinancialData),
                marketData: {
                    indices: marketData.indices,
                    currencies: marketData.currencies,
                    commodities: marketData.commodities,
                    marketStatus: marketData.marketStatus,
                    timestamp: marketData.timestamp
                },
                economicIndicators: economicData,
                sectorPerformance: sectorData,
                dataQuality: {
                    freshness: dataFreshness,
                    consistency: dataConsistency,
                    completeness: this.calculateCompleteness(userFinancialData)
                },
                summary: this.generateDataSummary(userFinancialData, marketData),
                timestamp: new Date().toISOString()
            };

            logger.success('REALIST: Real-time data compilation complete');
            return realTimeData;

		} catch (error) {
            logger.error('REALIST data fetch error', error);
            return this._getFallbackRealTimeData();
        }
    }

    enrichUserData(userData) {
        if (!userData) return null;

        // Add calculated fields
        const enriched = { ...userData };

        // Calculate total investment value
        if (userData.mutualFunds?.investments) {
            enriched.totalMFValue = userData.mutualFunds.investments.reduce(
                (sum, mf) => sum + parseFloat(mf.current_value || 0), 0
            );
        }

        if (userData.stocks?.holdings) {
            enriched.totalStockValue = userData.stocks.holdings.reduce(
                (sum, stock) => sum + parseFloat(stock.current_value || 0), 0
            );
        }

        // Add risk indicators
        enriched.riskIndicators = {
            debtExposure: this.calculateDebtExposure(userData),
            liquidityRatio: this.calculateLiquidityRatio(userData),
            concentrationRisk: this.assessConcentrationRisk(userData)
        };

        return enriched;
    }

    calculateDebtExposure(userData) {
        if (!userData?.netWorth) return 'unknown';
        
        const totalAssets = parseFloat(userData.netWorth.total_assets || 0);
        const totalLiabilities = parseFloat(userData.netWorth.total_liabilities || 0);
        
        if (totalAssets === 0) return 'unknown';
        
        const ratio = totalLiabilities / totalAssets;
        if (ratio < 0.2) return 'low';
        if (ratio < 0.4) return 'moderate';
        return 'high';
    }

    calculateLiquidityRatio(userData) {
        if (!userData?.netWorth?.assets_breakdown) return 0;
        
        const assets = userData.netWorth.assets_breakdown;
        const liquid = parseFloat(assets.savings_accounts || 0);
        const total = parseFloat(userData.netWorth.total_assets || 1);
        
        return (liquid / total * 100).toFixed(1);
    }

    assessConcentrationRisk(userData) {
        if (!userData?.stocks?.holdings) return 'unknown';
        
        const holdings = userData.stocks.holdings;
        if (holdings.length <= 2) return 'high';
        if (holdings.length <= 5) return 'moderate';
        return 'low';
    }

    assessDataFreshness(userData, marketData) {
        const freshness = {
            userDataAge: 'unknown',
            marketDataAge: 'fresh',
            overallStatus: 'good'
        };

        if (userData?.timestamp) {
            const age = Date.now() - new Date(userData.timestamp).getTime();
            const hoursOld = age / (1000 * 60 * 60);
            
            if (hoursOld < 1) freshness.userDataAge = 'fresh';
            else if (hoursOld < 24) freshness.userDataAge = 'recent';
            else freshness.userDataAge = 'stale';
        }

        if (marketData?.timestamp) {
            const age = Date.now() - new Date(marketData.timestamp).getTime();
            const minutesOld = age / (1000 * 60);
            
            if (minutesOld < 15) freshness.marketDataAge = 'live';
            else if (minutesOld < 60) freshness.marketDataAge = 'recent';
            else freshness.marketDataAge = 'delayed';
		}

		return freshness;
	}

    validateDataConsistency(userData) {
        const issues = [];

        if (userData?.netWorth) {
            const assets = parseFloat(userData.netWorth.total_assets || 0);
            const liabilities = parseFloat(userData.netWorth.total_liabilities || 0);
            const netWorth = parseFloat(userData.netWorth.total_net_worth || 0);

            if (Math.abs(netWorth - (assets - liabilities)) > 1000) {
                issues.push('Net worth calculation mismatch');
				}
			}

			return {
            isConsistent: issues.length === 0,
            issues
        };
    }

    calculateCompleteness(userData) {
        if (!userData) return 0;

        const dataPoints = [
            'netWorth',
            'transactions',
            'mutualFunds',
            'stocks',
            'creditReport',
            'epf'
        ];

        const available = dataPoints.filter(point => userData[point] !== null).length;
        return (available / dataPoints.length * 100).toFixed(0);
    }

    generateDataSummary(userData, marketData) {
        const summaryPoints = [];

        // User financial summary
        if (userData?.netWorth) {
            const netWorth = parseFloat(userData.netWorth.total_net_worth || 0);
            summaryPoints.push(`Net Worth: ₹${(netWorth / 100000).toFixed(2)}L`);
        }

        // Market summary
        if (marketData?.indices?.[0]) {
            const nifty = marketData.indices[0];
            summaryPoints.push(`Nifty 50: ${nifty.value?.toFixed(0)} (${nifty.changePercent > 0 ? '+' : ''}${nifty.changePercent?.toFixed(2)}%)`);
        }

        // Market status
        if (marketData?.marketStatus) {
            summaryPoints.push(`Market: ${marketData.marketStatus.status}`);
        }

        return summaryPoints.join(' | ');
    }

    _getFallbackRealTimeData() {
		return {
            userFinancialData: null,
            marketData: {
                indices: [
                    { name: 'Nifty 50', value: 22500, change: 85, changePercent: 0.38 },
                    { name: 'Sensex', value: 74200, change: 280, changePercent: 0.38 },
                    { name: 'Bank Nifty', value: 48000, change: 150, changePercent: 0.31 }
                ],
                currencies: { USDINR: 83.45, EURINR: 90.25, GBPINR: 105.80 },
                commodities: { gold: 68500, silver: 82000 },
                marketStatus: { status: 'Closed', isOpen: false }
            },
            economicIndicators: {
                inflation: 4.8,
                repoRate: 6.5,
                gdpGrowth: 7.2
            },
            sectorPerformance: {},
            dataQuality: { freshness: { overallStatus: 'limited' } },
            summary: 'Limited data available - using market estimates',
            timestamp: new Date().toISOString()
        };
    }

    _getFallbackResponse(prompt) {
        logger.warn('REALIST using fallback response');

        if (prompt.toLowerCase().includes('market') || prompt.toLowerCase().includes('nifty')) {
            return `**Current Indian Market Overview** (as of market close)

📊 **Major Indices**
- Nifty 50: ~22,500 (Benchmark for large-caps)
- Sensex: ~74,000 (BSE benchmark)
- Bank Nifty: ~48,000 (Banking sector index)

💱 **Currency**
- USD/INR: ~83.50

📈 **Market Context**
- RBI Repo Rate: 6.5%
- Inflation (CPI): ~4.8%
- GDP Growth: ~7%

🔍 **Key Observations**
1. Indian markets have shown resilience amid global volatility
2. FII flows remain a key driver of market direction
3. Banking and IT sectors lead market movements
4. SIP flows continue to support domestic inflows

For real-time data, please connect your financial accounts through AURA.`;
        }

        return `As your Market Realist, I provide grounded insights based on:

📊 **Real-Time Market Data**
- Indian indices (Nifty, Sensex, Bank Nifty)
- Sector performance
- Currency rates

📈 **Economic Indicators**
- RBI policy rates
- Inflation data
- GDP growth metrics

💰 **Your Financial Data**
- Portfolio current values
- Transaction analysis
- Investment performance

🔍 **Data Validation**
- Freshness checks
- Consistency validation
- Cross-verification

What market information would you like to explore?`;
    }
}

export default RealistAgent;
