/**
 * AURA Financial Platform - Azure OpenAI Service
 * 
 * Centralized Azure OpenAI GPT-4.1 integration with function calling,
 * tool use, and structured outputs for financial analysis.
 */

import { AzureOpenAI } from 'openai';
import dotenv from 'dotenv';
import https from 'https';
import { openaiLogger as logger } from './logger.js';

dotenv.config();

// Fix SSL certificate issues in development
if (process.env.NODE_ENV !== 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Financial calculation tools for function calling
const FINANCIAL_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'calculate_xirr',
            description: 'Calculate Extended Internal Rate of Return (XIRR) for investments with irregular cash flows',
            parameters: {
                type: 'object',
                properties: {
                    cash_flows: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                date: { type: 'string', description: 'Date in ISO format' },
                                amount: { type: 'number', description: 'Cash flow amount (negative for investments, positive for returns)' }
                            }
                        },
                        description: 'Array of cash flows with dates and amounts'
                    }
                },
                required: ['cash_flows']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'calculate_cagr',
            description: 'Calculate Compound Annual Growth Rate',
            parameters: {
                type: 'object',
                properties: {
                    initial_value: { type: 'number', description: 'Initial investment value' },
                    final_value: { type: 'number', description: 'Final investment value' },
                    years: { type: 'number', description: 'Number of years' }
                },
                required: ['initial_value', 'final_value', 'years']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'calculate_portfolio_risk',
            description: 'Calculate portfolio risk metrics including volatility and Sharpe ratio',
            parameters: {
                type: 'object',
                properties: {
                    returns: {
                        type: 'array',
                        items: { type: 'number' },
                        description: 'Array of periodic returns'
                    },
                    risk_free_rate: { type: 'number', description: 'Risk-free rate (default 6%)' }
                },
                required: ['returns']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'analyze_asset_allocation',
            description: 'Analyze and recommend optimal asset allocation based on risk profile',
            parameters: {
                type: 'object',
                properties: {
                    current_allocation: {
                        type: 'object',
                        description: 'Current asset allocation percentages'
                    },
                    risk_profile: {
                        type: 'string',
                        enum: ['conservative', 'moderate', 'aggressive'],
                        description: 'User risk profile'
                    },
                    age: { type: 'number', description: 'User age for life-stage allocation' },
                    investment_horizon: { type: 'number', description: 'Investment horizon in years' }
                },
                required: ['risk_profile']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'calculate_sip_projection',
            description: 'Project SIP investment growth over time',
            parameters: {
                type: 'object',
                properties: {
                    monthly_amount: { type: 'number', description: 'Monthly SIP amount' },
                    expected_return: { type: 'number', description: 'Expected annual return percentage' },
                    years: { type: 'number', description: 'Investment duration in years' },
                    step_up_percentage: { type: 'number', description: 'Annual SIP step-up percentage' }
                },
                required: ['monthly_amount', 'expected_return', 'years']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'calculate_loan_emi',
            description: 'Calculate EMI for loans',
            parameters: {
                type: 'object',
                properties: {
                    principal: { type: 'number', description: 'Loan principal amount' },
                    interest_rate: { type: 'number', description: 'Annual interest rate percentage' },
                    tenure_months: { type: 'number', description: 'Loan tenure in months' }
                },
                required: ['principal', 'interest_rate', 'tenure_months']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'analyze_spending_patterns',
            description: 'Analyze spending patterns from transactions',
            parameters: {
                type: 'object',
                properties: {
                    transactions: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                amount: { type: 'number' },
                                category: { type: 'string' },
                                date: { type: 'string' }
                            }
                        }
                    }
                },
                required: ['transactions']
            }
        }
    }
];

// Financial calculation implementations
function calculateXIRR(cashFlows) {
    if (!cashFlows || cashFlows.length < 2) return { xirr: 0, error: 'Insufficient data' };
    
    // Newton-Raphson method for XIRR
    let rate = 0.1;
    const tolerance = 0.0001;
    const maxIterations = 100;
    
    const sortedFlows = cashFlows.sort((a, b) => new Date(a.date) - new Date(b.date));
    const baseDate = new Date(sortedFlows[0].date);
    
    for (let i = 0; i < maxIterations; i++) {
        let npv = 0;
        let derivative = 0;
        
        for (const cf of sortedFlows) {
            const years = (new Date(cf.date) - baseDate) / (365.25 * 24 * 60 * 60 * 1000);
            const discountFactor = Math.pow(1 + rate, -years);
            npv += cf.amount * discountFactor;
            derivative -= (cf.amount * years * discountFactor) / (1 + rate);
        }
        
        if (Math.abs(npv) < tolerance) break;
        const newRate = rate - npv / derivative;
        if (Math.abs(newRate - rate) < tolerance) break;
        rate = newRate;
    }
    
    return { xirr: (rate * 100).toFixed(2), currency: 'INR' };
}

function calculateCAGR(initialValue, finalValue, years) {
    if (initialValue <= 0 || years <= 0) return { cagr: 0, error: 'Invalid inputs' };
    const cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
    return { cagr: cagr.toFixed(2), initial: initialValue, final: finalValue, years };
}

function calculatePortfolioRisk(returns, riskFreeRate = 0.06) {
    if (!returns || returns.length < 2) return { error: 'Insufficient data' };
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVolatility = stdDev * Math.sqrt(252) * 100;
    const annualizedReturn = mean * 252 * 100;
    const sharpeRatio = (annualizedReturn / 100 - riskFreeRate) / (annualizedVolatility / 100);
    
    return {
        volatility: annualizedVolatility.toFixed(2),
        sharpe_ratio: sharpeRatio.toFixed(2),
        annualized_return: annualizedReturn.toFixed(2),
        risk_level: annualizedVolatility > 25 ? 'High' : annualizedVolatility > 15 ? 'Medium' : 'Low'
    };
}

function analyzeAssetAllocation(currentAllocation, riskProfile, age = 30, investmentHorizon = 10) {
    const recommendations = {
        conservative: { equity: 30, debt: 50, gold: 10, liquid: 10 },
        moderate: { equity: 50, debt: 35, gold: 10, liquid: 5 },
        aggressive: { equity: 70, debt: 20, gold: 5, liquid: 5 }
    };
    
    let recommended = recommendations[riskProfile] || recommendations.moderate;
    
    // Age-based adjustment (100 - age rule modified)
    const ageAdjustedEquity = Math.min(Math.max(100 - age - 10, 20), 80);
    recommended.equity = Math.round((recommended.equity + ageAdjustedEquity) / 2);
    recommended.debt = 100 - recommended.equity - recommended.gold - recommended.liquid;
    
    return {
        current: currentAllocation || {},
        recommended,
        risk_profile: riskProfile,
        age,
        investment_horizon: investmentHorizon,
        rebalancing_needed: true
    };
}

function calculateSIPProjection(monthlyAmount, expectedReturn, years, stepUpPercentage = 0) {
    let totalInvested = 0;
    let futureValue = 0;
    const monthlyRate = expectedReturn / 100 / 12;
    const totalMonths = years * 12;
    let currentSIP = monthlyAmount;
    
    for (let month = 0; month < totalMonths; month++) {
        if (stepUpPercentage > 0 && month > 0 && month % 12 === 0) {
            currentSIP = currentSIP * (1 + stepUpPercentage / 100);
        }
        totalInvested += currentSIP;
        futureValue = (futureValue + currentSIP) * (1 + monthlyRate);
    }
    
    return {
        total_invested: Math.round(totalInvested),
        future_value: Math.round(futureValue),
        wealth_gained: Math.round(futureValue - totalInvested),
        returns_percentage: ((futureValue - totalInvested) / totalInvested * 100).toFixed(2),
        currency: 'INR'
    };
}

function calculateLoanEMI(principal, interestRate, tenureMonths) {
    const monthlyRate = interestRate / 100 / 12;
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    const totalPayment = emi * tenureMonths;
    const totalInterest = totalPayment - principal;
    
    return {
        emi: Math.round(emi),
        total_payment: Math.round(totalPayment),
        total_interest: Math.round(totalInterest),
        principal,
        interest_rate: interestRate,
        tenure_months: tenureMonths,
        currency: 'INR'
    };
}

function analyzeSpendingPatterns(transactions) {
    const categoryTotals = {};
    let totalSpending = 0;
    
    for (const txn of transactions) {
        if (txn.amount < 0) {
            const category = txn.category || 'Other';
            categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(txn.amount);
            totalSpending += Math.abs(txn.amount);
        }
    }
    
    const breakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        percentage: ((amount / totalSpending) * 100).toFixed(1)
    })).sort((a, b) => b.amount - a.amount);
    
    return {
        total_spending: Math.round(totalSpending),
        breakdown,
        top_category: breakdown[0]?.category || 'Unknown',
        currency: 'INR'
    };
}

// Process tool calls
function processToolCall(toolName, args) {
    logger.info(`Processing tool call: ${toolName}`, args);
    
    switch (toolName) {
        case 'calculate_xirr':
            return calculateXIRR(args.cash_flows);
        case 'calculate_cagr':
            return calculateCAGR(args.initial_value, args.final_value, args.years);
        case 'calculate_portfolio_risk':
            return calculatePortfolioRisk(args.returns, args.risk_free_rate);
        case 'analyze_asset_allocation':
            return analyzeAssetAllocation(args.current_allocation, args.risk_profile, args.age, args.investment_horizon);
        case 'calculate_sip_projection':
            return calculateSIPProjection(args.monthly_amount, args.expected_return, args.years, args.step_up_percentage);
        case 'calculate_loan_emi':
            return calculateLoanEMI(args.principal, args.interest_rate, args.tenure_months);
        case 'analyze_spending_patterns':
            return analyzeSpendingPatterns(args.transactions);
        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

class OpenAIService {
    constructor() {
        this.client = null;
        this.deployment = process.env.AZURE_OPENAI_CHATGPT_DEPLOYMENT || 'gpt-4.1';
        this.model = process.env.AZURE_OPENAI_CHATGPT_MODEL || 'gpt-4.1';
        this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
        this.initialized = false;
        this.useAzure = true;
    }

    initialize() {
        if (this.initialized) return true;
        
        // Try Azure OpenAI first
        const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
        
        if (azureEndpoint && azureApiKey) {
            try {
                this.client = new AzureOpenAI({
                    endpoint: azureEndpoint,
                    apiKey: azureApiKey,
                    apiVersion: this.apiVersion
                });
                this.useAzure = true;
                this.initialized = true;
                logger.success(`Azure OpenAI Service initialized`, {
                    endpoint: azureEndpoint.substring(0, 30) + '...',
                    deployment: this.deployment,
                    model: this.model,
                    apiVersion: this.apiVersion
                });
                return true;
            } catch (error) {
                logger.error('Azure OpenAI initialization failed', error);
            }
        }
        
        logger.warn('No Azure OpenAI credentials found - AI features limited');
        return false;
    }

    async chat(messages, options = {}) {
        if (!this.initialize()) {
            // Return a graceful fallback response instead of throwing
            return {
                choices: [{
                    message: {
                        content: 'I apologize, but I am currently unable to process your request. Please try again later or contact support.',
                        role: 'assistant'
                    },
                    finish_reason: 'stop'
                }],
                usage: { total_tokens: 0 }
            };
        }
        
        const startTime = Date.now();
        logger.info('Starting Azure OpenAI chat completion', { 
            deployment: this.deployment,
            messageCount: messages.length,
            tools: options.tools ? 'enabled' : 'disabled'
        });
        
        try {
            const response = await this.client.chat.completions.create({
                model: this.useAzure ? this.deployment : (options.model || 'gpt-4'),
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 1500,
                tools: options.tools,
                tool_choice: options.toolChoice,
                response_format: options.responseFormat
            });
            
            const duration = Date.now() - startTime;
            logger.success(`Chat completion finished in ${duration}ms`, {
                tokensUsed: response.usage?.total_tokens,
                finishReason: response.choices[0]?.finish_reason
            });
            
            // Return just the content string, not the full API response
            return response?.choices?.[0]?.message?.content || '';
        } catch (error) {
            logger.error('Chat completion failed', error);
            throw error;
        }
    }

    async chatWithTools(messages, customTools = null) {
        const tools = customTools || FINANCIAL_TOOLS;
        
        let currentMessages = [...messages];
        let iterations = 0;
        const maxIterations = 5;
        
        while (iterations < maxIterations) {
            iterations++;
            logger.info(`Tool iteration ${iterations}/${maxIterations}`);
            
            const response = await this.chat(currentMessages, { tools });
            const choice = response.choices[0];
            
            if (choice.finish_reason === 'stop') {
                return choice.message?.content || 'I apologize, but I could not generate a response. Please try again.';
            }
            
            if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
                currentMessages.push(choice.message);
                
                for (const toolCall of choice.message.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments);
                    
                    logger.agent('TOOLS', `Executing: ${toolName}`, toolArgs);
                    
                    const result = processToolCall(toolName, toolArgs);
                    
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                    
                    logger.success(`Tool ${toolName} completed`, result);
                }
            } else {
                return choice.message?.content || 'I apologize, but I could not complete the analysis. Please try again.';
            }
        }
        
        logger.warn('Max tool iterations reached');
        return currentMessages[currentMessages.length - 1]?.content || 'Unable to complete analysis';
    }

    async generateFinancialAnalysis(userQuery, financialData, context = {}) {
        const systemPrompt = `You are AURA, an advanced AI financial advisor for Indian users. You have access to tools for precise financial calculations.

CRITICAL RULES:
1. ALWAYS use the provided tools for ANY mathematical calculations - NEVER calculate manually
2. For XIRR, CAGR, EMI, or any financial metrics - USE THE TOOLS
3. Provide advice specific to Indian financial markets and regulations
4. Reference real Indian products: NSE/BSE stocks, SEBI-regulated mutual funds, Indian banks
5. Consider Indian tax implications (Section 80C, LTCG, STCG, etc.)
6. All amounts should be in INR (₹)

USER'S FINANCIAL DATA:
${JSON.stringify(financialData, null, 2)}

CONTEXT:
${JSON.stringify(context, null, 2)}

Provide comprehensive, actionable financial advice. Use tools when calculations are needed.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
        ];
        
        return this.chatWithTools(messages);
    }

    async generateAgentResponse(agentType, prompt, context = {}) {
        const agentPersonalities = {
            strategist: `You are the Strategist Agent of AURA. You excel at long-term financial planning, goal-based investing, and creating comprehensive financial strategies. You think in terms of 5-10-20 year horizons and always consider inflation, life stages, and goal alignment.`,
            
            quant: `You are the Quant Agent of AURA. You are a mathematical expert who ALWAYS uses tools for calculations. You specialize in XIRR, CAGR, Sharpe ratios, volatility analysis, and portfolio optimization. You NEVER do mental math - you ALWAYS use the calculation tools.`,
            
            doer: `You are the Doer Agent of AURA. You convert strategies into specific, actionable steps. You recommend exact platforms (Zerodha, Groww, Kuvera), specific amounts, deadlines, and step-by-step instructions. You're practical and implementation-focused.`,
            
            realist: `You are the Realist Agent of AURA. You ground all advice in current market reality. You consider current Nifty levels, sector performance, interest rate environment, inflation data, and RBI policies. You're data-driven and fact-based.`,
            
            communicator: `You are the Communicator Agent of AURA. You translate complex financial jargon into simple, relatable language. You use analogies, examples, and encouraging tone. You make finance accessible and motivating.`
        };
        
        const systemPrompt = `${agentPersonalities[agentType] || agentPersonalities.strategist}

You have access to financial calculation tools. USE THEM for any mathematical operations.
Always provide advice specific to Indian financial markets (INR, NSE/BSE, SEBI regulations, Indian tax laws).

Context: ${JSON.stringify(context, null, 2)}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ];
        
        return this.chatWithTools(messages);
    }

    isAvailable() {
        // Check if Azure OpenAI credentials are available
        const hasAzure = !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        return this.initialized || hasAzure || hasOpenAI;
    }

    getStatus() {
        return {
            available: this.isAvailable(),
            initialized: this.initialized,
            provider: this.useAzure ? 'Azure OpenAI' : 'OpenAI',
            deployment: this.deployment,
            model: this.model,
            apiVersion: this.apiVersion,
            toolsCount: FINANCIAL_TOOLS.length
        };
    }
}

// Singleton instance
export const openaiService = new OpenAIService();

export default OpenAIService;
