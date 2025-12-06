/**
 * AURA Financial Platform - RAG Service
 * 
 * Retrieval Augmented Generation for financial knowledge.
 * Uses embeddings to find relevant financial knowledge and context.
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
import { ragLogger as logger } from './logger.js';

dotenv.config();

// Indian Financial Knowledge Base
const FINANCIAL_KNOWLEDGE_BASE = [
    // Tax Knowledge
    {
        id: 'tax-80c',
        category: 'taxation',
        title: 'Section 80C Deductions',
        content: `Section 80C of Income Tax Act allows deductions up to ₹1,50,000 per year. Eligible investments include:
        - ELSS (Equity Linked Savings Scheme) - 3 year lock-in, potential for highest returns
        - PPF (Public Provident Fund) - 15 year lock-in, tax-free returns at ~7.1%
        - NSC (National Savings Certificate) - 5 year lock-in
        - Tax Saving FDs - 5 year lock-in
        - EPF/VPF contributions
        - Life Insurance premiums
        - NPS (additional ₹50,000 under 80CCD(1B))
        - Home loan principal repayment
        - Children's tuition fees (up to 2 children)`,
        keywords: ['80c', 'tax saving', 'elss', 'ppf', 'nsc', 'tax deduction', 'section 80c']
    },
    {
        id: 'tax-ltcg',
        category: 'taxation',
        title: 'Long Term Capital Gains Tax',
        content: `Long Term Capital Gains (LTCG) on equity investments:
        - Holding period: More than 12 months for equity/equity MFs
        - Tax rate: 10% on gains exceeding ₹1,00,000 per year
        - No indexation benefit for equity
        - Debt funds: Holding period >36 months, 20% with indexation
        - Real estate: Holding period >24 months, 20% with indexation
        - Section 54 exemption: Reinvest in residential property within 2 years
        - Section 54F: Reinvest sale proceeds in residential property`,
        keywords: ['ltcg', 'long term capital gains', 'equity tax', 'capital gains', 'holding period']
    },
    {
        id: 'tax-stcg',
        category: 'taxation',
        title: 'Short Term Capital Gains Tax',
        content: `Short Term Capital Gains (STCG) on equity investments:
        - Holding period: Less than 12 months for equity/equity MFs
        - Tax rate: 15% flat rate under Section 111A
        - Debt funds (<36 months): Added to income, taxed at slab rate
        - Real estate (<24 months): Added to income, taxed at slab rate
        - No benefit of indexation for STCG
        - Tax loss harvesting: Offset STCG against STCL`,
        keywords: ['stcg', 'short term capital gains', 'short term tax', '15% tax']
    },

    // Investment Knowledge
    {
        id: 'mf-types',
        category: 'investments',
        title: 'Types of Mutual Funds in India',
        content: `Mutual Fund Categories (SEBI Classification):
        EQUITY FUNDS:
        - Large Cap: Top 100 companies by market cap, stable returns
        - Mid Cap: 101-250 by market cap, higher growth potential
        - Small Cap: 251+ by market cap, high risk high reward
        - Flexi Cap: Manager decides allocation across caps
        - Multi Cap: Mandatory 25% each in large/mid/small
        - ELSS: Tax saving, 3-year lock-in, equity exposure
        
        DEBT FUNDS:
        - Liquid: Very short duration, emergency fund parking
        - Ultra Short: 3-6 month duration, slightly higher returns
        - Short Duration: 1-3 years, moderate risk
        - Corporate Bond: Higher yields, credit risk
        - Gilt: Government securities, interest rate risk
        
        HYBRID FUNDS:
        - Aggressive Hybrid: 65-80% equity
        - Conservative Hybrid: 10-25% equity
        - Balanced Advantage/Dynamic Asset Allocation
        - Arbitrage: Low risk, equity taxation`,
        keywords: ['mutual fund', 'mf types', 'large cap', 'mid cap', 'small cap', 'debt fund', 'hybrid', 'elss']
    },
    {
        id: 'sip-benefits',
        category: 'investments',
        title: 'SIP Investment Strategy',
        content: `Systematic Investment Plan (SIP) Benefits:
        - Rupee Cost Averaging: Buy more units when NAV is low, fewer when high
        - Power of Compounding: ₹10,000/month at 12% for 20 years = ₹1 Cr
        - Discipline: Automated investing removes emotional decisions
        - Flexibility: Start with ₹500, increase anytime
        - SIP Top-up: Increase SIP by 10-15% annually with salary hikes
        
        SIP Best Practices:
        - Don't stop SIPs during market crashes
        - Choose direct plans (0.5-1% lower expense ratio)
        - Align SIP date with salary credit date
        - Diversify across 4-6 funds maximum
        - Review annually, not monthly`,
        keywords: ['sip', 'systematic investment', 'rupee cost averaging', 'monthly investment']
    },
    {
        id: 'emergency-fund',
        category: 'planning',
        title: 'Emergency Fund Planning',
        content: `Emergency Fund Guidelines:
        - Amount: 6-12 months of monthly expenses
        - Single income household: 12 months
        - Dual income, stable jobs: 6 months
        - Business owners/freelancers: 12-18 months
        
        Where to Park Emergency Fund:
        1. Savings Account (3-4%): Instant access, low returns
        2. Liquid Funds (5-6%): T+1 redemption, better returns
        3. Sweep-in FDs: Auto-sweep between savings and FD
        4. Ultra Short Duration Funds: Slightly higher returns
        
        Emergency Fund Rules:
        - Don't invest in equity or long-duration debt
        - Split across 2-3 instruments for safety
        - Review and top-up annually
        - Only use for true emergencies (job loss, medical)`,
        keywords: ['emergency fund', 'rainy day fund', 'liquid fund', 'financial safety']
    },
    {
        id: 'asset-allocation',
        category: 'planning',
        title: 'Asset Allocation Strategies',
        content: `Asset Allocation by Age/Risk Profile:
        
        RULE OF THUMB: 100 - Age = Equity %
        
        CONSERVATIVE (Age 50+, Low Risk):
        - Equity: 20-30%
        - Debt: 50-60%
        - Gold: 10%
        - Cash/Liquid: 10%
        
        MODERATE (Age 35-50, Medium Risk):
        - Equity: 50-60%
        - Debt: 30-40%
        - Gold: 5-10%
        - Cash/Liquid: 5%
        
        AGGRESSIVE (Age <35, High Risk):
        - Equity: 70-80%
        - Debt: 15-20%
        - Gold: 5%
        - Cash/Liquid: 5%
        
        Rebalancing: Review quarterly, rebalance if deviation >5%`,
        keywords: ['asset allocation', 'portfolio allocation', 'equity debt ratio', 'rebalancing']
    },

    // Market Knowledge
    {
        id: 'nifty-sensex',
        category: 'markets',
        title: 'Indian Stock Market Indices',
        content: `Major Indian Indices:
        
        NIFTY 50: Top 50 companies on NSE
        - Represents ~65% of total market cap
        - Diverse sectors: IT, Banking, FMCG, Pharma
        - Historical CAGR: ~12-14% (long term)
        
        SENSEX (BSE 30): Top 30 companies on BSE
        - Oldest index, established 1986
        - Similar companies to Nifty
        
        SECTORAL INDICES:
        - Nifty Bank: Top banking stocks
        - Nifty IT: Technology companies
        - Nifty Pharma: Healthcare & Pharma
        - Nifty FMCG: Consumer goods
        - Nifty Auto: Automobile sector
        
        Market Timings:
        - Pre-open: 9:00-9:08 AM
        - Trading: 9:15 AM - 3:30 PM
        - Settlement: T+1 (next trading day)`,
        keywords: ['nifty', 'sensex', 'stock market', 'index', 'nse', 'bse']
    },
    {
        id: 'rbi-rates',
        category: 'economy',
        title: 'RBI Policy Rates',
        content: `RBI Key Rates and Impact:
        
        REPO RATE: Rate at which RBI lends to banks
        - Current: ~6.5% (check latest)
        - Impact: Higher repo = Higher loan EMIs, FD rates
        - Lower repo = Cheaper loans, lower FD rates
        
        REVERSE REPO: Rate at which RBI borrows from banks
        - Controls excess liquidity in system
        
        CRR (Cash Reserve Ratio): ~4.5%
        - Banks must keep this % with RBI
        
        SLR (Statutory Liquidity Ratio): ~18%
        - Banks must invest in govt securities
        
        INFLATION TARGETING:
        - RBI target: 4% (+/- 2%)
        - CPI Inflation impacts interest rates
        
        Impact on Investments:
        - Rate hikes: Good for debt, bad for equity short-term
        - Rate cuts: Good for equity, bond prices rise`,
        keywords: ['repo rate', 'rbi', 'interest rate', 'monetary policy', 'inflation']
    },

    // Insurance Knowledge
    {
        id: 'term-insurance',
        category: 'insurance',
        title: 'Term Life Insurance',
        content: `Term Insurance Guidelines:
        
        Coverage Amount:
        - Formula: 10-15x Annual Income + Outstanding Loans + Goals
        - Example: ₹10L income → ₹1-1.5 Cr coverage
        
        Ideal Features:
        - Pure term plan (no return of premium)
        - Claim settlement ratio >95%
        - Sum assured shouldn't decrease
        - Riders: Critical illness, accidental death
        
        Top Term Insurance (2024):
        - LIC Tech Term
        - HDFC Life Click 2 Protect
        - ICICI Prudential iProtect Smart
        - Max Life Smart Secure Plus
        - Tata AIA Sampoorna Raksha
        
        Premium Tips:
        - Buy young (25-30 age), premium stays low
        - Non-smoker = 30-50% lower premium
        - Compare on PolicyBazaar, InsuranceDekho`,
        keywords: ['term insurance', 'life insurance', 'coverage', 'sum assured']
    },
    {
        id: 'health-insurance',
        category: 'insurance',
        title: 'Health Insurance',
        content: `Health Insurance Guidelines:
        
        Coverage Amount:
        - Individual: ₹10-20 Lakhs minimum
        - Family Floater: ₹20-50 Lakhs
        - Parents (60+): Dedicated policy or super top-up
        
        Key Features to Check:
        - Room rent limits (preferably no cap)
        - Pre-existing disease waiting period
        - Co-payment (avoid if possible)
        - Network hospitals in your area
        - Claim settlement ratio
        - No-claim bonus
        
        Top Health Insurance (2024):
        - HDFC Ergo Optima Secure
        - Care Health Insurance
        - Star Health (for seniors)
        - Niva Bupa Health Companion
        - Tata AIG Medicare
        
        Section 80D Benefits:
        - Self/Family: ₹25,000 deduction
        - Parents <60: ₹25,000 additional
        - Parents 60+: ₹50,000 additional
        - Preventive health checkup: ₹5,000`,
        keywords: ['health insurance', 'mediclaim', '80d', 'family floater', 'medical insurance']
    },

    // Retirement Planning
    {
        id: 'retirement-planning',
        category: 'planning',
        title: 'Retirement Planning India',
        content: `Retirement Planning Framework:
        
        RETIREMENT CORPUS CALCULATION:
        - Monthly expenses × 12 × 25-30 years
        - Adjust for inflation (6-7% annually)
        - Example: ₹50,000/month today = ₹3-4 Cr corpus needed
        
        RETIREMENT INVESTMENT OPTIONS:
        1. NPS (National Pension System)
           - Tax benefit: 80C + 80CCD(1B) = ₹2L
           - Lock-in till 60
           - 60% lump sum + 40% annuity
        
        2. EPF (Employee Provident Fund)
           - Employer + Employee contribution
           - 8.1% interest (tax-free)
           - EEE status (Exempt-Exempt-Exempt)
        
        3. PPF (Public Provident Fund)
           - ₹1.5L/year max
           - 15 year lock-in
           - Tax-free returns
        
        4. Mutual Funds
           - Equity for long-term growth
           - Switch to debt near retirement
           - SWP for regular income
        
        RETIREMENT AGE: Plan for 60-65
        FIRE: Financial Independence, Retire Early = 25x annual expenses`,
        keywords: ['retirement', 'pension', 'nps', 'epf', 'ppf', 'fire', 'financial independence']
    },

    // Gold Investment
    {
        id: 'gold-investment',
        category: 'investments',
        title: 'Gold Investment Options',
        content: `Gold Investment in India:
        
        PHYSICAL GOLD:
        - Jewelry: High making charges (10-25%), not for investment
        - Coins/Bars: Lower charges, purity certified
        
        DIGITAL/PAPER GOLD:
        1. Sovereign Gold Bonds (SGB)
           - RBI issued, safest form
           - 2.5% annual interest
           - Capital gains tax-free if held to maturity (8 years)
           - Linked to gold price
           - Exit after 5 years
        
        2. Gold ETFs
           - Trade like stocks on NSE/BSE
           - Demat required
           - Expense ratio: 0.5-1%
           - Easy liquidity
        
        3. Gold Mutual Funds
           - Invest in Gold ETFs
           - SIP option available
           - No demat needed
        
        4. Digital Gold (Paytm, PhonePe)
           - Small amounts (₹1 onwards)
           - Higher spreads
           - Convert to physical
        
        ALLOCATION: 5-10% of portfolio in gold`,
        keywords: ['gold', 'sgb', 'sovereign gold bond', 'gold etf', 'digital gold']
    }
];

class RAGService {
    constructor() {
        this.client = null;
        this.knowledgeBase = FINANCIAL_KNOWLEDGE_BASE;
        this.embeddings = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.client = new OpenAI({ apiKey });
            logger.info('RAG Service initialized with OpenAI embeddings');
        }
        // Silent initialization - no warning logs for missing API key
        
        this.initialized = true;
        logger.success(`Knowledge base loaded: ${this.knowledgeBase.length} documents`);
    }

    // Keyword-based search (fallback when embeddings not available)
    keywordSearch(query, topK = 3) {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        
        const scores = this.knowledgeBase.map(doc => {
            let score = 0;
            
            // Check keywords
            for (const keyword of doc.keywords) {
                if (queryLower.includes(keyword)) {
                    score += 10;
                }
                for (const word of queryWords) {
                    if (keyword.includes(word) || word.includes(keyword)) {
                        score += 5;
                    }
                }
            }
            
            // Check title
            if (doc.title.toLowerCase().includes(queryLower)) {
                score += 15;
            }
            for (const word of queryWords) {
                if (doc.title.toLowerCase().includes(word)) {
                    score += 3;
                }
            }
            
            // Check content
            for (const word of queryWords) {
                if (doc.content.toLowerCase().includes(word)) {
                    score += 1;
                }
            }
            
            return { doc, score };
        });
        
        return scores
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map(s => s.doc);
    }

    // Semantic search using embeddings
    async semanticSearch(query, topK = 3) {
        if (!this.client) {
            return this.keywordSearch(query, topK);
        }
        
        try {
            // Get query embedding
            const queryEmbedding = await this.getEmbedding(query);
            
            // Get embeddings for all documents (cached)
            const docEmbeddings = await this.getDocumentEmbeddings();
            
            // Calculate cosine similarity
            const similarities = docEmbeddings.map(({ doc, embedding }) => ({
                doc,
                similarity: this.cosineSimilarity(queryEmbedding, embedding)
            }));
            
            // Return top K most similar
            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, topK)
                .map(s => s.doc);
                
        } catch (error) {
            logger.error('Semantic search failed, falling back to keyword search', error);
            return this.keywordSearch(query, topK);
        }
    }

    async getEmbedding(text) {
        const cacheKey = text.substring(0, 100);
        if (this.embeddings.has(cacheKey)) {
            return this.embeddings.get(cacheKey);
        }
        
        const response = await this.client.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.substring(0, 8000) // Limit text length
        });
        
        const embedding = response.data[0].embedding;
        this.embeddings.set(cacheKey, embedding);
        return embedding;
    }

    async getDocumentEmbeddings() {
        const results = [];
        
        for (const doc of this.knowledgeBase) {
            const text = `${doc.title}\n${doc.content}`;
            const embedding = await this.getEmbedding(text);
            results.push({ doc, embedding });
        }
        
        return results;
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Main retrieval method
    async retrieve(query, topK = 3) {
        await this.initialize();
        
        logger.rag('Retrieving context', { query: query.substring(0, 100), topK });
        
        const results = await this.semanticSearch(query, topK);
        
        logger.rag('Retrieved documents', {
            count: results.length,
            documents: results.map(r => r.title)
        });
        
        return results;
    }

    // Get context string for LLM
    async getContextForQuery(query, maxTokens = 2000) {
        const results = await this.retrieve(query, 3);
        
        if (results.length === 0) {
            return '';
        }
        
        let context = 'RELEVANT FINANCIAL KNOWLEDGE:\n\n';
        let tokenEstimate = 0;
        
        for (const doc of results) {
            const docText = `### ${doc.title}\n${doc.content}\n\n`;
            const docTokens = docText.length / 4; // Rough token estimate
            
            if (tokenEstimate + docTokens > maxTokens) break;
            
            context += docText;
            tokenEstimate += docTokens;
        }
        
        return context;
    }

    // Search by category
    getByCategory(category) {
        return this.knowledgeBase.filter(doc => doc.category === category);
    }

    // Get all categories
    getCategories() {
        const categories = new Set(this.knowledgeBase.map(doc => doc.category));
        return Array.from(categories);
    }

    // Add new document to knowledge base
    addDocument(doc) {
        if (!doc.id || !doc.title || !doc.content) {
            throw new Error('Document must have id, title, and content');
        }
        
        this.knowledgeBase.push({
            ...doc,
            keywords: doc.keywords || [],
            category: doc.category || 'general'
        });
        
        logger.rag('Added document to knowledge base', { id: doc.id, title: doc.title });
    }

    getStatus() {
        return {
            initialized: this.initialized,
            documentCount: this.knowledgeBase.length,
            categories: this.getCategories(),
            embeddingsEnabled: !!this.client,
            cachedEmbeddings: this.embeddings.size
        };
    }
}

// Singleton instance
export const ragService = new RAGService();

export default RAGService;





