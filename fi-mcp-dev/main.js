/**
 * Fi MCP Server - Mock Financial Data Provider
 * AURA Financial Platform
 * 
 * This server simulates the Fi Money MCP API for development and demonstration.
 * It provides realistic financial data for Indian users.
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

// Session storage
const sessions = new Map();

// Demo user profiles with realistic Indian financial data
const userProfiles = {
    '1111111111': {
        name: 'Rahul Sharma',
        profile: 'basic_saver',
        description: 'Basic saver with only savings account',
        netWorth: 250000,
        riskProfile: 'conservative'
    },
    '2222222222': {
        name: 'Priya Patel',
        profile: 'diversified_investor',
        description: 'Well-diversified portfolio with MFs, stocks, EPF',
        netWorth: 4500000,
        riskProfile: 'moderate'
    },
    '3333333333': {
        name: 'Amit Kumar',
        profile: 'beginner_investor',
        description: 'New investor with small MF portfolio',
        netWorth: 750000,
        riskProfile: 'moderate-conservative'
    },
    '4444444444': {
        name: 'Sneha Reddy',
        profile: 'high_net_worth',
        description: 'HNI with multiple bank accounts and EPF UANs',
        netWorth: 12500000,
        riskProfile: 'aggressive'
    },
    '5555555555': {
        name: 'Vikram Singh',
        profile: 'balanced_portfolio',
        description: 'Balanced investor with stocks and MFs',
        netWorth: 2800000,
        riskProfile: 'moderate'
    },
    '6666666666': {
        name: 'Ananya Iyer',
        profile: 'mf_focused',
        description: 'Mutual fund focused large portfolio',
        netWorth: 8500000,
        riskProfile: 'moderate-aggressive'
    },
    '7777777777': {
        name: 'Rajesh Gupta',
        profile: 'debt_heavy',
        description: 'High debt with poor MF returns',
        netWorth: 450000,
        riskProfile: 'conservative'
    },
    '8888888888': {
        name: 'Meera Krishnan',
        profile: 'sip_investor',
        description: 'Consistent SIP investor',
        netWorth: 3200000,
        riskProfile: 'moderate'
    },
    '9999999999': {
        name: 'Arjun Nair',
        profile: 'fixed_income',
        description: 'Fixed income focused portfolio',
        netWorth: 5500000,
        riskProfile: 'conservative'
    },
    '1010101010': {
        name: 'Kavya Shah',
        profile: 'gold_investor',
        description: 'Gold and FD focused portfolio',
        netWorth: 6200000,
        riskProfile: 'conservative'
    }
};

// Generate realistic financial data based on profile
function generateNetWorthData(phoneNumber) {
    const profile = userProfiles[phoneNumber] || userProfiles['2222222222'];
    const baseNetWorth = profile.netWorth;
    
    // Randomize slightly for realism
    const variance = baseNetWorth * 0.05 * (Math.random() - 0.5);
    const totalNetWorth = Math.round(baseNetWorth + variance);
    
    const assets = {
        savings_accounts: Math.round(totalNetWorth * 0.15),
        fixed_deposits: Math.round(totalNetWorth * 0.20),
        mutual_funds: Math.round(totalNetWorth * 0.35),
        stocks: Math.round(totalNetWorth * 0.15),
        epf: Math.round(totalNetWorth * 0.10),
        gold: Math.round(totalNetWorth * 0.05)
    };
    
    const liabilities = {
        home_loan: profile.profile === 'debt_heavy' ? Math.round(totalNetWorth * 0.6) : Math.round(totalNetWorth * 0.1),
        car_loan: Math.round(totalNetWorth * 0.02),
        credit_card: Math.round(totalNetWorth * 0.01),
        personal_loan: profile.profile === 'debt_heavy' ? Math.round(totalNetWorth * 0.15) : 0
    };
    
    const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
    const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);
    
    return {
        user_name: profile.name,
        phone_number: phoneNumber,
        total_net_worth: totalAssets - totalLiabilities,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        assets_breakdown: assets,
        liabilities_breakdown: liabilities,
        risk_profile: profile.riskProfile,
        last_updated: new Date().toISOString(),
        currency: 'INR',
        monthly_change: Math.round((Math.random() - 0.3) * totalNetWorth * 0.02),
        yearly_return_percentage: (Math.random() * 15 + 5).toFixed(2)
    };
}

function generateBankTransactions(phoneNumber) {
    const profile = userProfiles[phoneNumber] || userProfiles['2222222222'];
    const monthlyIncome = Math.round(profile.netWorth / 24); // Approximate monthly income
    
    const transactionTypes = [
        { type: 'SALARY', amount: monthlyIncome, category: 'Income' },
        { type: 'UPI_PAYMENT', amount: -Math.round(monthlyIncome * 0.02), category: 'Shopping' },
        { type: 'BILL_PAYMENT', amount: -Math.round(monthlyIncome * 0.05), category: 'Utilities' },
        { type: 'EMI_DEBIT', amount: -Math.round(monthlyIncome * 0.15), category: 'EMI' },
        { type: 'SIP_DEBIT', amount: -Math.round(monthlyIncome * 0.20), category: 'Investment' },
        { type: 'ATM_WITHDRAWAL', amount: -Math.round(monthlyIncome * 0.05), category: 'Cash' },
        { type: 'FOOD_DELIVERY', amount: -1250, category: 'Food' },
        { type: 'GROCERY', amount: -4500, category: 'Shopping' },
        { type: 'FUEL', amount: -3000, category: 'Transport' },
        { type: 'SUBSCRIPTION', amount: -999, category: 'Entertainment' }
    ];
    
    const transactions = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
        const txnType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const txnDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        
        transactions.push({
            transaction_id: uuidv4(),
            date: txnDate.toISOString(),
            description: txnType.type.replace('_', ' '),
            amount: txnType.amount + Math.round(Math.random() * 500 - 250),
            type: txnType.amount > 0 ? 'CREDIT' : 'DEBIT',
            category: txnType.category,
            balance_after: Math.round(profile.netWorth * 0.15 + Math.random() * 50000),
            bank_name: ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank'][Math.floor(Math.random() * 4)],
            account_type: 'Savings'
        });
    }
    
    return {
        phone_number: phoneNumber,
        user_name: profile.name,
        total_transactions: transactions.length,
        transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
        summary: {
            total_credits: transactions.filter(t => t.type === 'CREDIT').reduce((a, b) => a + b.amount, 0),
            total_debits: Math.abs(transactions.filter(t => t.type === 'DEBIT').reduce((a, b) => a + b.amount, 0)),
            average_balance: Math.round(profile.netWorth * 0.15)
        },
        last_updated: new Date().toISOString()
    };
}

function generateMFTransactions(phoneNumber) {
    const profile = userProfiles[phoneNumber] || userProfiles['2222222222'];
    const mfValue = Math.round(profile.netWorth * 0.35);
    
    const mutualFunds = [
        { name: 'HDFC Top 100 Fund - Direct Growth', category: 'Large Cap', amc: 'HDFC AMC' },
        { name: 'SBI Small Cap Fund - Direct Growth', category: 'Small Cap', amc: 'SBI MF' },
        { name: 'Axis Bluechip Fund - Direct Growth', category: 'Large Cap', amc: 'Axis AMC' },
        { name: 'Mirae Asset Emerging Bluechip', category: 'Large & Mid Cap', amc: 'Mirae Asset' },
        { name: 'Parag Parikh Flexi Cap Fund', category: 'Flexi Cap', amc: 'PPFAS' },
        { name: 'Kotak Equity Opportunities Fund', category: 'Multi Cap', amc: 'Kotak AMC' },
        { name: 'ICICI Prudential Value Discovery', category: 'Value Fund', amc: 'ICICI Pru' },
        { name: 'Nippon India Growth Fund', category: 'Mid Cap', amc: 'Nippon India' }
    ];
    
    const numFunds = Math.min(Math.floor(Math.random() * 5) + 3, mutualFunds.length);
    const selectedFunds = mutualFunds.slice(0, numFunds);
    
    const investments = selectedFunds.map((fund, index) => {
        const invested = Math.round(mfValue / numFunds * (0.8 + Math.random() * 0.4));
        const returns = (Math.random() * 25 - 5);
        const currentValue = Math.round(invested * (1 + returns / 100));
        
        return {
            fund_id: uuidv4(),
            fund_name: fund.name,
            amc: fund.amc,
            category: fund.category,
            invested_amount: invested,
            current_value: currentValue,
            returns_percentage: returns.toFixed(2),
            returns_absolute: currentValue - invested,
            units: (invested / (Math.random() * 200 + 50)).toFixed(4),
            nav: (Math.random() * 200 + 50).toFixed(4),
            sip_active: Math.random() > 0.3,
            sip_amount: Math.random() > 0.3 ? Math.round(invested / 24) : 0,
            sip_date: Math.floor(Math.random() * 28) + 1,
            purchase_date: new Date(Date.now() - Math.random() * 365 * 3 * 24 * 60 * 60 * 1000).toISOString(),
            folio_number: `FOL${Math.random().toString(36).substr(2, 8).toUpperCase()}`
        };
    });
    
    const totalInvested = investments.reduce((a, b) => a + b.invested_amount, 0);
    const totalCurrentValue = investments.reduce((a, b) => a + b.current_value, 0);
    
    return {
        phone_number: phoneNumber,
        user_name: profile.name,
        total_investments: investments.length,
        total_invested: totalInvested,
        total_current_value: totalCurrentValue,
        total_returns: totalCurrentValue - totalInvested,
        total_returns_percentage: ((totalCurrentValue - totalInvested) / totalInvested * 100).toFixed(2),
        xirr: (Math.random() * 15 + 8).toFixed(2),
        investments: investments,
        last_updated: new Date().toISOString()
    };
}

function generateStockTransactions(phoneNumber) {
    const profile = userProfiles[phoneNumber] || userProfiles['2222222222'];
    const stockValue = Math.round(profile.netWorth * 0.15);
    
    const stocks = [
        { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Energy' },
        { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT' },
        { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT' },
        { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking' },
        { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking' },
        { symbol: 'WIPRO', name: 'Wipro Ltd', sector: 'IT' },
        { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom' },
        { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG' },
        { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking' },
        { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking' }
    ];
    
    const numStocks = Math.min(Math.floor(Math.random() * 6) + 2, stocks.length);
    const selectedStocks = stocks.slice(0, numStocks);
    
    const holdings = selectedStocks.map(stock => {
        const avgPrice = Math.random() * 2000 + 500;
        const currentPrice = avgPrice * (0.8 + Math.random() * 0.5);
        const quantity = Math.floor(stockValue / numStocks / avgPrice);
        
        return {
            stock_id: uuidv4(),
            symbol: stock.symbol,
            company_name: stock.name,
            sector: stock.sector,
            quantity: quantity,
            average_price: avgPrice.toFixed(2),
            current_price: currentPrice.toFixed(2),
            invested_value: Math.round(avgPrice * quantity),
            current_value: Math.round(currentPrice * quantity),
            returns_percentage: ((currentPrice - avgPrice) / avgPrice * 100).toFixed(2),
            day_change: ((Math.random() - 0.5) * 3).toFixed(2),
            broker: ['Zerodha', 'Groww', 'Angel One', 'Upstox'][Math.floor(Math.random() * 4)],
            demat_account: `IN${Math.random().toString().substr(2, 12)}`
        };
    });
    
    const totalInvested = holdings.reduce((a, b) => a + b.invested_value, 0);
    const totalCurrentValue = holdings.reduce((a, b) => a + b.current_value, 0);
    
    return {
        phone_number: phoneNumber,
        user_name: profile.name,
        total_holdings: holdings.length,
        total_invested: totalInvested,
        total_current_value: totalCurrentValue,
        total_returns: totalCurrentValue - totalInvested,
        total_returns_percentage: ((totalCurrentValue - totalInvested) / totalInvested * 100).toFixed(2),
        holdings: holdings,
        last_updated: new Date().toISOString()
    };
}

function generateCreditReport(phoneNumber) {
    const profile = userProfiles[phoneNumber] || userProfiles['2222222222'];
    
    let creditScore;
    if (profile.profile === 'debt_heavy') {
        creditScore = Math.floor(Math.random() * 100) + 580;
    } else if (profile.profile === 'high_net_worth') {
        creditScore = Math.floor(Math.random() * 50) + 780;
    } else {
        creditScore = Math.floor(Math.random() * 150) + 680;
    }
    
    const creditCards = [
        { name: 'HDFC Regalia', limit: 300000 },
        { name: 'ICICI Amazon Pay', limit: 150000 },
        { name: 'Axis Flipkart', limit: 100000 },
        { name: 'SBI SimplyCLICK', limit: 200000 }
    ];
    
    const numCards = Math.floor(Math.random() * 3) + 1;
    const selectedCards = creditCards.slice(0, numCards);
    
    const cards = selectedCards.map(card => ({
        card_id: uuidv4(),
        card_name: card.name,
        credit_limit: card.limit,
        current_outstanding: Math.round(card.limit * Math.random() * 0.4),
        available_limit: Math.round(card.limit * (0.6 + Math.random() * 0.4)),
        minimum_due: Math.round(card.limit * Math.random() * 0.05),
        due_date: new Date(Date.now() + Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        utilization_percentage: (Math.random() * 40).toFixed(2)
    }));
    
    const totalLimit = cards.reduce((a, b) => a + b.credit_limit, 0);
    const totalOutstanding = cards.reduce((a, b) => a + b.current_outstanding, 0);
    
    return {
        phone_number: phoneNumber,
        user_name: profile.name,
        credit_score: creditScore,
        credit_score_rating: creditScore >= 750 ? 'Excellent' : creditScore >= 700 ? 'Good' : creditScore >= 650 ? 'Fair' : 'Poor',
        bureau: 'CIBIL',
        total_credit_limit: totalLimit,
        total_outstanding: totalOutstanding,
        credit_utilization: ((totalOutstanding / totalLimit) * 100).toFixed(2),
        credit_cards: cards,
        active_loans: profile.profile === 'debt_heavy' ? 3 : Math.floor(Math.random() * 2),
        on_time_payments_percentage: creditScore >= 700 ? 98 : 85,
        credit_age_months: Math.floor(Math.random() * 120) + 24,
        hard_inquiries_last_6_months: Math.floor(Math.random() * 3),
        last_updated: new Date().toISOString()
    };
}

function generateEPFDetails(phoneNumber) {
    const profile = userProfiles[phoneNumber] || userProfiles['2222222222'];
    const epfValue = Math.round(profile.netWorth * 0.10);
    
    return {
        phone_number: phoneNumber,
        user_name: profile.name,
        uan_number: `UAN${Math.random().toString().substr(2, 12)}`,
        pf_account_number: `TN/${Math.random().toString().substr(2, 5)}/${Math.random().toString().substr(2, 7)}/000/${Math.random().toString().substr(2, 7)}`,
        employer_name: ['Tata Consultancy Services', 'Infosys Ltd', 'Wipro Technologies', 'HCL Technologies', 'Tech Mahindra'][Math.floor(Math.random() * 5)],
        total_balance: epfValue,
        employee_share: Math.round(epfValue * 0.5),
        employer_share: Math.round(epfValue * 0.37),
        pension_share: Math.round(epfValue * 0.13),
        interest_earned_this_year: Math.round(epfValue * 0.081),
        current_interest_rate: 8.10,
        service_years: Math.floor(Math.random() * 15) + 2,
        monthly_contribution: Math.round(profile.netWorth / 300),
        last_contribution_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        passbook_entries: Math.floor(Math.random() * 50) + 10,
        kyc_status: 'Complete',
        nomination_status: Math.random() > 0.3 ? 'Registered' : 'Pending',
        last_updated: new Date().toISOString()
    };
}

// Available tools
const tools = [
    {
        name: 'fetch_net_worth',
        description: 'Fetch complete net worth breakdown including assets and liabilities',
        parameters: { phone_number: { type: 'string', required: true } }
    },
    {
        name: 'fetch_bank_transactions',
        description: 'Fetch recent bank transactions and spending analysis',
        parameters: { phone_number: { type: 'string', required: true } }
    },
    {
        name: 'fetch_mf_transactions',
        description: 'Fetch mutual fund portfolio with returns and SIP details',
        parameters: { phone_number: { type: 'string', required: true } }
    },
    {
        name: 'fetch_stock_transactions',
        description: 'Fetch stock holdings with current prices and returns',
        parameters: { phone_number: { type: 'string', required: true } }
    },
    {
        name: 'fetch_credit_report',
        description: 'Fetch credit score and credit card details',
        parameters: { phone_number: { type: 'string', required: true } }
    },
    {
        name: 'fetch_epf_details',
        description: 'Fetch EPF/PF account details and balance',
        parameters: { phone_number: { type: 'string', required: true } }
    }
];

// MCP Stream endpoint
app.post('/mcp/stream', (req, res) => {
    const { jsonrpc, id, method, params } = req.body;
    const sessionId = req.headers['mcp-session-id'];
    
    console.log(`📡 MCP Request: ${method}`, { sessionId, params });
    
    // Handle initialize method
    if (method === 'initialize') {
        const newSessionId = uuidv4();
        sessions.set(newSessionId, { 
            initialized: true, 
            createdAt: new Date().toISOString() 
        });
        
        return res.json({
            jsonrpc: '2.0',
            id,
            result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                    name: 'Fi MCP Server',
                    version: '1.0.0'
                },
                capabilities: {
                    tools: {}
                },
                sessionId: newSessionId
            }
        });
    }
    
    if (method === 'tools/list') {
        return res.json({
            jsonrpc: '2.0',
            id,
            result: { tools }
        });
    }
    
    if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const phoneNumber = args?.phone_number || '2222222222';
        
        let result;
        
        switch (name) {
            case 'fetch_net_worth':
                result = generateNetWorthData(phoneNumber);
                break;
            case 'fetch_bank_transactions':
                result = generateBankTransactions(phoneNumber);
                break;
            case 'fetch_mf_transactions':
                result = generateMFTransactions(phoneNumber);
                break;
            case 'fetch_stock_transactions':
                result = generateStockTransactions(phoneNumber);
                break;
            case 'fetch_credit_report':
                result = generateCreditReport(phoneNumber);
                break;
            case 'fetch_epf_details':
                result = generateEPFDetails(phoneNumber);
                break;
            default:
                return res.json({
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32601, message: `Unknown tool: ${name}` }
                });
        }
        
        console.log(`✅ Tool ${name} executed for ${phoneNumber}`);
        
        return res.json({
            jsonrpc: '2.0',
            id,
            result: {
                content: [{ type: 'text', text: JSON.stringify(result) }]
            }
        });
    }
    
    res.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
    });
});

// Root route - welcome page
app.get('/', (req, res) => {
    res.json({
        service: 'Fi MCP Server',
        version: '1.0.0',
        description: 'Mock Financial Data Provider for AURA Financial Platform',
        status: 'running',
        endpoints: {
            health: 'GET /health',
            mcpStream: 'POST /mcp/stream',
            profiles: 'GET /api/profiles'
        },
        documentation: 'https://github.com/Aryanjstar/fi-mcp-server',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Fi MCP Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Get available user profiles
app.get('/api/profiles', (req, res) => {
    const profiles = Object.entries(userProfiles).map(([phone, data]) => ({
        phone,
        name: data.name,
        profile: data.profile,
        description: data.description
    }));
    res.json({ profiles });
});

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Fi MCP Server running on ${HOST}:${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   POST /mcp/stream - MCP JSON-RPC endpoint`);
    console.log(`   GET  /health     - Health check`);
    console.log(`   GET  /api/profiles - Available demo profiles`);
    console.log(`\n📱 Demo phone numbers:`);
    Object.entries(userProfiles).forEach(([phone, data]) => {
        console.log(`   ${phone}: ${data.name} (${data.description})`);
    });
});





