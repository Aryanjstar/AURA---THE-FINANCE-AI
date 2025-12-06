/**
 * Quant Agent - Quantitative Financial Analysis
 * Uses OpenAI GPT-4.1 for insights with mathematical calculations
 * 
 * OpenAI x NxtWave Buildathon
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { openaiService } from "../services/openai-service.js";
import { logger } from "../services/logger.js";
import * as math from "mathjs";
import dotenv from "dotenv";

dotenv.config();

export class QuantAgent {
    constructor() {
        this.name = "Quant";
        this.icon = "🔢";
        this.model = null;
        this.genAI = null;
        this.useOpenAI = openaiService.isAvailable();
        
        if (!this.useOpenAI && process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        }
        
        logger.agent('QUANT', `Initialized (Using ${this.useOpenAI ? 'OpenAI' : 'Gemini'})`);
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
            logger.agent('QUANT', 'Generating quantitative analysis...');

            const systemPrompt = `You are an expert Quantitative Analyst specializing in Indian financial markets.

Your capabilities:
1. Calculate and explain financial metrics (XIRR, CAGR, Sharpe Ratio, etc.)
2. Portfolio risk assessment and volatility analysis
3. Asset allocation optimization
4. Performance benchmarking against Nifty 50, Sensex
5. Statistical analysis of investments

Always:
- Show calculations step by step
- Use accurate formulas
- Provide context for Indian markets
- Reference benchmarks (Nifty 50 CAGR ~12-14%)
- Use ₹ for currency values
- Express returns as percentages`;

            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ], { temperature: 0.3 });
                
                logger.success('QUANT response generated via OpenAI');
                return response;
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(`${systemPrompt}\n\nQuery: ${prompt}`);
                logger.success('QUANT response generated via Gemini');
                return result.response.text();
            }

            return this._getFallbackResponse(prompt);
        } catch (error) {
            logger.error('QUANT error', error);
            return this._getFallbackResponse(prompt);
        }
    }

    async performQuantitativeAnalysis(financialData) {
        try {
            logger.agent('QUANT', 'Performing comprehensive quantitative analysis...');

            if (!financialData) {
                return this._getDefaultAnalysis();
            }

            const metrics = {};

            // Calculate Net Worth
            metrics.netWorth = this.calculateNetWorth(financialData);
            
            // Calculate Portfolio Return (XIRR approximation)
            metrics.portfolioReturn = this.calculatePortfolioReturn(financialData);
            
            // Calculate CAGR if historical data available
            metrics.cagr = this.calculateCAGR(financialData);
            
            // Calculate Volatility (simplified)
            metrics.volatility = this.calculateVolatility(financialData);
            
            // Calculate Sharpe Ratio
            metrics.sharpeRatio = this.calculateSharpeRatio(
                metrics.portfolioReturn?.value || 12,
                metrics.volatility?.value || 15
            );
            
            // Calculate Asset Allocation
            metrics.assetAllocation = this.calculateAssetAllocation(financialData);
            
            // Calculate Debt Metrics
            metrics.debtToIncome = this.calculateDebtToIncome(financialData);
            metrics.creditUtilization = this.calculateCreditUtilization(financialData);
            
            // Diversification Score
            const diversificationScore = this.calculateDiversificationScore(metrics.assetAllocation);

            // Generate AI insights
            const insights = await this.generateQuantInsights(metrics, financialData);

            logger.success('QUANT analysis complete', { metricsCount: Object.keys(metrics).length });

            return {
                success: true,
                metrics,
                insights,
                diversificationScore,
                confidence: 0.85,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Quantitative analysis error', error);
            return this._getDefaultAnalysis();
        }
    }

    calculateNetWorth(data) {
        let totalAssets = 0;
        let totalLiabilities = 0;

        if (data.netWorth) {
            totalAssets = parseFloat(data.netWorth.total_assets || 0);
            totalLiabilities = parseFloat(data.netWorth.total_liabilities || 0);
        }

        const netWorth = totalAssets - totalLiabilities;

        return {
            value: netWorth,
            formatted: `₹${(netWorth / 100000).toFixed(2)}L`,
            assets: totalAssets,
            liabilities: totalLiabilities,
            status: this._getNetWorthStatus(netWorth)
        };
    }

    _getNetWorthStatus(netWorth) {
        if (netWorth > 10000000) return 'excellent';
        if (netWorth > 5000000) return 'very_good';
        if (netWorth > 2000000) return 'good';
        if (netWorth > 500000) return 'moderate';
        return 'building';
    }

    calculatePortfolioReturn(data) {
        let totalInvested = 0;
        let totalCurrent = 0;

        // From mutual funds
        if (data.mutualFunds?.investments) {
            data.mutualFunds.investments.forEach(mf => {
                totalInvested += parseFloat(mf.invested_amount || 0);
                totalCurrent += parseFloat(mf.current_value || 0);
            });
        }

        // From stocks
        if (data.stocks?.holdings) {
            data.stocks.holdings.forEach(stock => {
                totalInvested += parseFloat(stock.invested_value || 0);
                totalCurrent += parseFloat(stock.current_value || 0);
            });
        }

        if (totalInvested === 0) {
            return { value: 0, formatted: '0%', status: 'no_data' };
        }

        const returnPercent = ((totalCurrent - totalInvested) / totalInvested) * 100;
        const annualizedReturn = data.mutualFunds?.xirr || returnPercent * 0.4; // Rough annualization

        return {
            value: annualizedReturn,
            formatted: `${annualizedReturn.toFixed(2)}%`,
            absoluteReturn: totalCurrent - totalInvested,
            totalInvested,
            totalCurrent,
            status: annualizedReturn > 12 ? 'good' : annualizedReturn > 8 ? 'moderate' : 'below_benchmark'
        };
    }

    calculateCAGR(data) {
        // Use XIRR if available, otherwise estimate
        if (data.mutualFunds?.xirr) {
            const xirr = parseFloat(data.mutualFunds.xirr);
            return {
                value: xirr,
                formatted: `${xirr.toFixed(2)}%`,
                years: 3,
                benchmark: 12.5,
                status: xirr > 12.5 ? 'above_benchmark' : 'below_benchmark'
            };
        }

        // Estimate from portfolio return
        const portfolioReturn = this.calculatePortfolioReturn(data);
        const estimatedCAGR = portfolioReturn.value * 0.8; // Conservative estimate

        return {
            value: estimatedCAGR,
            formatted: `${estimatedCAGR.toFixed(2)}%`,
            years: 3,
            benchmark: 12.5,
            status: estimatedCAGR > 12.5 ? 'above_benchmark' : 'below_benchmark',
            estimated: true
        };
    }

    calculateVolatility(data) {
        // Simplified volatility based on asset allocation
        const allocation = this.calculateAssetAllocation(data);
        
        const volatilities = {
            equity: 20,
            debt: 5,
            gold: 12,
            cash: 0.5,
            real_estate: 8
        };

        let weightedVolatility = 0;
        if (allocation) {
            weightedVolatility += (allocation.equity / 100) * volatilities.equity;
            weightedVolatility += (allocation.debt / 100) * volatilities.debt;
            weightedVolatility += (allocation.gold / 100) * volatilities.gold;
            weightedVolatility += (allocation.cash / 100) * volatilities.cash;
        } else {
            weightedVolatility = 15; // Default moderate volatility
        }

        return {
            value: weightedVolatility,
            formatted: `${weightedVolatility.toFixed(2)}%`,
            status: weightedVolatility < 10 ? 'low' : weightedVolatility < 20 ? 'moderate' : 'high',
            category: this._getVolatilityCategory(weightedVolatility)
        };
    }

    _getVolatilityCategory(vol) {
        if (vol < 8) return 'Conservative';
        if (vol < 15) return 'Moderate';
        if (vol < 22) return 'Aggressive';
        return 'Very Aggressive';
    }

    calculateSharpeRatio(portfolioReturn, volatility, riskFreeRate = 6.5) {
        // Sharpe Ratio = (Portfolio Return - Risk Free Rate) / Volatility
        const excessReturn = portfolioReturn - riskFreeRate;
        const sharpe = volatility > 0 ? excessReturn / volatility : 0;

        return {
            value: sharpe,
            formatted: sharpe.toFixed(2),
            portfolioReturn,
            riskFreeRate,
            volatility,
            interpretation: this._interpretSharpe(sharpe)
        };
    }

    _interpretSharpe(sharpe) {
        if (sharpe < 0) return 'Underperforming risk-free investments';
        if (sharpe < 0.5) return 'Below average risk-adjusted returns';
        if (sharpe < 1) return 'Acceptable risk-adjusted returns';
        if (sharpe < 2) return 'Good risk-adjusted returns';
        return 'Excellent risk-adjusted returns';
    }

    calculateAssetAllocation(data) {
        if (!data.netWorth?.assets_breakdown) {
            return {
                equity: 40,
                debt: 35,
                gold: 10,
                cash: 15,
                status: 'estimated'
            };
        }

        const assets = data.netWorth.assets_breakdown;
        const total = Object.values(assets).reduce((a, b) => a + parseFloat(b || 0), 0);

        if (total === 0) {
            return { equity: 0, debt: 0, gold: 0, cash: 100, status: 'no_assets' };
        }

        return {
            equity: ((parseFloat(assets.mutual_funds || 0) + parseFloat(assets.stocks || 0)) / total * 100),
            debt: ((parseFloat(assets.fixed_deposits || 0) + parseFloat(assets.epf || 0)) / total * 100),
            gold: (parseFloat(assets.gold || 0) / total * 100),
            cash: (parseFloat(assets.savings_accounts || 0) / total * 100),
            status: 'calculated'
        };
    }

    calculateDebtToIncome(data) {
        // Estimate monthly income from transactions
        let monthlyIncome = 75000; // Default
        
        if (data.transactions?.summary?.total_credits) {
            monthlyIncome = data.transactions.summary.total_credits;
        }

        let monthlyDebtPayment = 0;
        if (data.netWorth?.liabilities_breakdown) {
            const liabilities = data.netWorth.liabilities_breakdown;
            // Estimate EMI as 1% of loan amounts
            monthlyDebtPayment = Object.values(liabilities).reduce((a, b) => a + parseFloat(b || 0), 0) * 0.01;
        }

        const ratio = monthlyIncome > 0 ? monthlyDebtPayment / monthlyIncome : 0;

        return {
            value: ratio,
            formatted: `${(ratio * 100).toFixed(1)}%`,
            monthlyDebt: monthlyDebtPayment,
            monthlyIncome,
            status: ratio < 0.36 ? 'healthy' : ratio < 0.5 ? 'moderate' : 'high',
            recommendation: ratio > 0.36 ? 'Consider reducing debt' : 'Debt levels are healthy'
        };
    }

    calculateCreditUtilization(data) {
        if (!data.creditReport) {
            return { value: 0, formatted: '0%', status: 'no_data' };
        }

        const utilization = parseFloat(data.creditReport.credit_utilization || 0) / 100;

        return {
            value: utilization,
            formatted: `${(utilization * 100).toFixed(1)}%`,
            status: utilization < 0.3 ? 'excellent' : utilization < 0.5 ? 'good' : 'high',
            recommendation: utilization > 0.3 ? 'Keep utilization below 30%' : 'Good credit utilization'
        };
    }

    calculateDiversificationScore(allocation) {
        if (!allocation || allocation.status === 'no_assets') return 0;

        // Ideal allocation for moderate risk: Equity 50%, Debt 30%, Gold 10%, Cash 10%
        const ideal = { equity: 50, debt: 30, gold: 10, cash: 10 };
        
        let score = 100;
        score -= Math.abs(allocation.equity - ideal.equity) * 0.5;
        score -= Math.abs(allocation.debt - ideal.debt) * 0.5;
        score -= Math.abs(allocation.gold - ideal.gold) * 0.5;
        score -= Math.abs(allocation.cash - ideal.cash) * 0.5;

        return Math.max(0, Math.min(100, score));
    }

    async generateQuantInsights(metrics, financialData) {
        const insightPrompt = `Based on this quantitative analysis, provide 3-4 key insights:

Net Worth: ${metrics.netWorth?.formatted || 'N/A'}
Portfolio Return: ${metrics.portfolioReturn?.formatted || 'N/A'}
CAGR: ${metrics.cagr?.formatted || 'N/A'}
Volatility: ${metrics.volatility?.formatted || 'N/A'}
Sharpe Ratio: ${metrics.sharpeRatio?.formatted || 'N/A'}
Asset Allocation: Equity ${metrics.assetAllocation?.equity?.toFixed(1)}%, Debt ${metrics.assetAllocation?.debt?.toFixed(1)}%
Debt-to-Income: ${metrics.debtToIncome?.formatted || 'N/A'}
Credit Score: ${financialData?.creditReport?.credit_score || 'N/A'}

Provide actionable insights specific to Indian markets. Be concise.`;

        try {
            if (this.useOpenAI) {
                const response = await openaiService.chat([
                    { role: 'system', content: 'You are a quantitative analyst. Provide brief, actionable insights.' },
                    { role: 'user', content: insightPrompt }
                ], { temperature: 0.4, maxTokens: 500 });

                return response.split('\n').filter(line => line.trim().length > 0).slice(0, 4);
            }

            await this._initializeModel();
            if (this.model) {
                const result = await this.model.generateContent(insightPrompt);
                return result.response.text().split('\n').filter(line => line.trim().length > 0).slice(0, 4);
            }
        } catch (error) {
            logger.warn('Failed to generate AI insights', { error: error.message });
        }

        // Fallback insights
        return this._generateFallbackInsights(metrics);
    }

    _generateFallbackInsights(metrics) {
        const insights = [];

        if (metrics.portfolioReturn?.value > 12) {
            insights.push('✅ Your portfolio return exceeds Nifty 50 benchmark - excellent performance!');
        } else {
            insights.push('📊 Consider reviewing underperforming investments to improve returns.');
        }

        if (metrics.sharpeRatio?.value > 0.5) {
            insights.push('💪 Good risk-adjusted returns - your portfolio is efficiently managed.');
        } else {
            insights.push('⚖️ Risk-adjusted returns can be improved through better diversification.');
        }

        if (metrics.debtToIncome?.value < 0.36) {
            insights.push('✅ Debt levels are healthy - good financial discipline.');
        } else {
            insights.push('⚠️ Consider paying down high-interest debt to improve cash flow.');
        }

        insights.push('💡 Review asset allocation quarterly and rebalance if needed.');

        return insights;
    }

    _getDefaultAnalysis() {
        return {
            success: true,
            metrics: {
                netWorth: { value: 0, formatted: '₹0', status: 'no_data' },
                portfolioReturn: { value: 0, formatted: '0%', status: 'no_data' },
                volatility: { value: 15, formatted: '15%', status: 'moderate' },
                sharpeRatio: { value: 0.5, formatted: '0.50', interpretation: 'Estimated' }
            },
            insights: [
                'Connect your financial accounts to get personalized analysis.',
                'AURA can analyze your investments, calculate XIRR, and provide optimization tips.',
                'Link your bank, mutual funds, and stocks for comprehensive insights.'
            ],
            diversificationScore: 50,
            confidence: 0.5,
            timestamp: new Date().toISOString()
        };
    }

    _getFallbackResponse(prompt) {
        logger.warn('QUANT using fallback response');

        if (prompt.toLowerCase().includes('xirr') || prompt.toLowerCase().includes('return')) {
            return `**XIRR (Extended Internal Rate of Return)** is the most accurate way to measure mutual fund returns in India.

**How XIRR Works:**
- Considers the actual dates of each investment and redemption
- Perfect for SIP investments where amounts vary
- More accurate than absolute or simple returns

**Example Calculation:**
If you invested ₹10,000 monthly for 3 years:
- Total Invested: ₹3,60,000
- Current Value: ₹4,50,000
- Absolute Return: 25%
- XIRR: ~14.5% (accounts for timing)

**Benchmarks for Indian Markets:**
- Nifty 50 XIRR (5 years): ~12-14%
- Good Equity MF XIRR: >15%
- Debt Funds XIRR: 7-9%

Would you like me to calculate XIRR for your specific investments?`;
        }

        return `As your Quant Analyst, I can help you with:

📊 **Performance Metrics**
- XIRR calculation for SIPs
- CAGR for lump sum investments
- Portfolio returns vs benchmarks

📈 **Risk Analysis**
- Volatility measurement
- Sharpe Ratio calculation
- Maximum drawdown analysis

⚖️ **Portfolio Analytics**
- Asset allocation optimization
- Diversification scoring
- Correlation analysis

💰 **Financial Ratios**
- Debt-to-income ratio
- Expense ratio analysis
- Credit utilization tracking

What would you like me to analyze?`;
    }
}

export default QuantAgent;
