/**
 * Agent Orchestrator - Optimized Multi-Agent System
 * 
 * Features:
 * - Single comprehensive response (not two-phase)
 * - Parallel agent execution for speed
 * - Dynamic agent selection based on query complexity
 * - Clean, formatted financial advice
 * 
 * OpenAI x NxtWave Buildathon
 */

import { logger } from "../services/logger.js";
import { ragService } from "../services/rag-service.js";
import { marketDataService } from "../services/market-data-service.js";
import { openaiService } from "../services/openai-service.js";
import { observabilityService } from "../services/observability-service.js";

// Shared Context for Agent-to-Agent Communication
class SharedContext {
    constructor() {
        this.userQuery = '';
        this.intent = null;
        this.ragContext = '';
        this.marketData = null;
        this.agentOutputs = new Map();
        this.insights = [];
        this.calculations = [];
        this.recommendations = [];
        this.timestamp = new Date().toISOString();
    }

    addAgentOutput(agentName, output) {
        this.agentOutputs.set(agentName, {
            output,
            timestamp: new Date().toISOString()
        });
    }

    getAgentOutput(agentName) {
        return this.agentOutputs.get(agentName)?.output || null;
    }

    getAllAgentOutputs() {
        const outputs = {};
        for (const [name, data] of this.agentOutputs) {
            outputs[name] = data.output;
        }
        return outputs;
    }

    toPromptContext() {
        let context = `=== CONTEXT FROM OTHER AGENTS ===\n`;
        for (const [name, data] of this.agentOutputs) {
            const output = typeof data.output === 'string' 
                ? data.output.substring(0, 800) 
                : JSON.stringify(data.output).substring(0, 800);
            context += `\n[${name.toUpperCase()}]:\n${output}\n`;
        }
        return context;
    }
}

export class AgentOrchestrator {
    constructor(agents) {
        this.agents = agents;
        this.timeout = 45000; // 45 seconds max
        
        logger.info('Agent Orchestrator initialized', { 
            agents: Object.keys(agents)
        });
    }

    getAgentStatus() {
        return Object.entries(this.agents).map(([name, agent]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            icon: agent.icon || '🤖',
            status: 'ready'
        }));
    }

    /**
     * Check if query is finance-related
     */
    isFinanceRelated(message) {
        const lowerMessage = message.toLowerCase();
        
        // Finance-related keywords
        const financeKeywords = [
            // Investment
            'invest', 'sip', 'mutual fund', 'stock', 'share', 'portfolio', 'nifty', 'sensex',
            'equity', 'debt', 'bond', 'etf', 'ipo', 'dividend', 'return', 'cagr', 'xirr',
            // Banking
            'bank', 'fd', 'fixed deposit', 'rd', 'recurring', 'savings', 'account', 'loan',
            'emi', 'interest', 'credit', 'debit', 'upi', 'neft', 'rtgs',
            // Tax
            'tax', '80c', '80d', 'deduction', 'ltcg', 'stcg', 'elss', 'income tax', 'gst',
            // Insurance
            'insurance', 'lic', 'term plan', 'health insurance', 'life insurance', 'premium',
            // Retirement
            'retire', 'pension', 'epf', 'ppf', 'nps', 'gratuity', 'pf',
            // Money & Goals
            'money', 'wealth', 'finance', 'financial', 'budget', 'expense', 'income', 'salary',
            'goal', 'corpus', 'crore', 'lakh', 'rupee', '₹', 'rs', 'inr',
            // Market
            'market', 'bull', 'bear', 'rally', 'correction', 'index', 'sector',
            // Crypto
            'crypto', 'bitcoin', 'ethereum',
            // Real Estate
            'property', 'real estate', 'house', 'home loan', 'rent', 'rera',
            // Economy
            'inflation', 'gdp', 'rbi', 'repo rate', 'economy', 'recession',
            // Common finance queries
            'how should i invest', 'where to invest', 'best investment', 'how much', 'calculate',
            'net worth', 'asset', 'liability', 'gold', 'silver', 'commodity'
        ];
        
        // Check if any finance keyword is present
        const hasFinanceKeyword = financeKeywords.some(kw => lowerMessage.includes(kw));
        
        // Check for numeric values with currency indicators (likely financial)
        const hasFinancialNumbers = /₹\s*\d|rs\.?\s*\d|\d+\s*(lakh|crore|k|l|cr)|monthly|yearly|annual/i.test(message);
        
        // Check for age + investment pattern
        const hasAgeInvestPattern = /\d+\s*(year|yr).*old.*invest|\d+\s*(year|yr).*plan/i.test(lowerMessage);
        
        return hasFinanceKeyword || hasFinancialNumbers || hasAgeInvestPattern;
    }

    /**
     * Main Chat Processing - Returns ONE comprehensive response
     * Runs agents in parallel where possible
     */
    async processChat(message, context = {}, progressCallback = null) {
        const startTime = Date.now();
        const requestId = `CHAT-${Date.now().toString(36).toUpperCase()}`;
        
        logger.divider();
        logger.info(`🚀 [${requestId}] Processing: "${message.substring(0, 80)}..."`);

        const sharedContext = new SharedContext();
        sharedContext.userQuery = message;
        
        // Add chat history context if available
        if (context.chatHistory && context.chatHistory.length > 0) {
            sharedContext.chatHistory = context.chatHistory;
            logger.info(`📚 Using ${context.chatHistory.length} messages for context`);
        }
        
        try {
            // === CHECK IF FINANCE RELATED ===
            if (!this.isFinanceRelated(message)) {
                logger.info(`❌ [${requestId}] Non-finance query rejected`);
                return {
                    success: true,
                    response: `I'm AURA, your AI-powered financial advisor! 🎯

I specialize in helping you with:
• **Investments** - SIPs, Mutual Funds, Stocks, ETFs
• **Tax Planning** - Section 80C, ELSS, Tax-saving strategies
• **Financial Goals** - Retirement, Home, Education planning
• **Banking** - FDs, Loans, Credit Cards
• **Insurance** - Term, Health, Life insurance
• **Market Insights** - Nifty, Sensex, Sector analysis

Please ask me anything related to personal finance or investing, and I'll provide you with actionable insights tailored for Indian investors!

**Try asking:** "How should I invest ₹10,000 monthly for retirement?" or "What is ELSS and how does it save tax?"`,
                    intent: 'off_topic',
                    complexity: 'simple',
                    agentsUsed: [],
                    executionTime: `${Date.now() - startTime}ms`,
                    agentActivity: []
                };
            }

            // === STEP 1: Quick Preparation (Parallel) ===
            progressCallback?.({
                phase: 'analyzing',
                message: 'Understanding your question...',
                progress: 10,
                activeAgents: []
            });

            const [intent, ragContext, marketData] = await Promise.all([
                this.analyzeIntent(message),
                ragService.getContextForQuery(message).catch(() => ''),
                marketDataService.getMarketOverview().catch(() => ({}))
            ]);

            sharedContext.intent = intent;
            sharedContext.ragContext = ragContext;
            sharedContext.marketData = marketData;

            logger.info(`📊 Intent: ${intent.primary_intent} | Complexity: ${intent.complexity} | Agents: ${intent.required_agents.length}`);

            // === STEP 2: Execute Agents ===
            const requiredAgents = intent.required_agents;
            const agentResults = [];

            progressCallback?.({
                phase: 'processing',
                message: `AI Agents analyzing...`,
                progress: 25,
                activeAgents: requiredAgents.map(a => ({
                    name: a.charAt(0).toUpperCase() + a.slice(1),
                    icon: this.agents[a]?.icon || '🤖'
                }))
            });

            // Execute agents based on complexity
            if (intent.complexity === 'simple') {
                // Simple: Run 2 agents sequentially
                logger.info(`🚀 [${requestId}] Simple path: ${requiredAgents.length} agents`);
                
                for (let i = 0; i < requiredAgents.length; i++) {
                    const agentName = requiredAgents[i];
                    progressCallback?.({
                        phase: 'processing',
                        message: `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} analyzing...`,
                        progress: 30 + (i * 30),
                        currentAgent: agentName
                    });
                    
                    const result = await this.executeAgent(agentName, sharedContext, requestId);
                    if (result) {
                        agentResults.push(result);
                        sharedContext.addAgentOutput(agentName, result.response);
                    }
                }
                
            } else if (intent.complexity === 'medium') {
                // Medium: Run 2-3 agents sequentially for coherence
                for (const agentName of requiredAgents.slice(0, 3)) {
                    progressCallback?.({
                        phase: 'processing',
                        message: `${agentName.charAt(0).toUpperCase() + agentName.slice(1)} analyzing...`,
                        progress: 25 + (agentResults.length * 20),
                        currentAgent: agentName
                    });
                    
                    const result = await this.executeAgent(agentName, sharedContext, requestId);
                    if (result) {
                        agentResults.push(result);
                        sharedContext.addAgentOutput(agentName, result.response);
                    }
                }
                
            } else {
                // Complex: Run agents in optimized parallel groups
                // Group 1: Data gathering (realist)
                if (requiredAgents.includes('realist')) {
                    progressCallback?.({
                        phase: 'processing',
                        message: 'Gathering market data...',
                        progress: 30,
                        currentAgent: 'realist'
                    });
                    const result = await this.executeAgent('realist', sharedContext, requestId);
                    if (result) {
                        agentResults.push(result);
                        sharedContext.addAgentOutput('realist', result.response);
                    }
                }

                // Group 2: Analysis (quant + strategist in parallel)
                const analysisAgents = ['quant', 'strategist'].filter(a => requiredAgents.includes(a));
                if (analysisAgents.length > 0) {
                    progressCallback?.({
                        phase: 'processing',
                        message: 'Running analysis...',
                        progress: 50,
                        currentAgent: analysisAgents.join(', ')
                    });
                    
                    const analysisResults = await Promise.all(
                        analysisAgents.map(a => this.executeAgent(a, sharedContext, requestId))
                    );
                    
                    analysisResults.forEach((result, idx) => {
                        if (result) {
                            agentResults.push(result);
                            sharedContext.addAgentOutput(analysisAgents[idx], result.response);
                        }
                    });
                }

                // Group 3: Action planning (doer)
                if (requiredAgents.includes('doer')) {
                    progressCallback?.({
                        phase: 'processing',
                        message: 'Creating action plan...',
                        progress: 70,
                        currentAgent: 'doer'
                    });
                    const result = await this.executeAgent('doer', sharedContext, requestId);
                    if (result) {
                        agentResults.push(result);
                        sharedContext.addAgentOutput('doer', result.response);
                    }
                }

                // Group 4: Communication (final synthesis)
                if (requiredAgents.includes('communicator')) {
                    progressCallback?.({
                        phase: 'processing',
                        message: 'Preparing response...',
                        progress: 85,
                        currentAgent: 'communicator'
                    });
                    const result = await this.executeAgent('communicator', sharedContext, requestId);
                    if (result) {
                        agentResults.push(result);
                        sharedContext.addAgentOutput('communicator', result.response);
                    }
                }
            }

            // === STEP 3: Generate Final Response ===
            progressCallback?.({
                phase: 'finalizing',
                message: 'Preparing your answer...',
                progress: 95
            });

            const finalResponse = await this.generateFinalResponse(
                message, 
                intent, 
                sharedContext, 
                agentResults,
                requestId
            );

            const totalTime = Date.now() - startTime;
            logger.success(`✅ [${requestId}] Complete in ${totalTime}ms`);

            progressCallback?.({
                phase: 'complete',
                message: 'Done!',
                progress: 100
            });

            return {
                success: true,
                response: finalResponse,
                intent: intent.primary_intent,
                complexity: intent.complexity,
                agentsUsed: agentResults.map(r => r.name),
                executionTime: `${totalTime}ms`,
                agentActivity: agentResults.map(r => ({
                    name: r.name,
                    icon: r.icon,
                    status: 'complete'
                }))
            };

        } catch (error) {
            logger.error(`[${requestId}] Failed: ${error.message}`);
            return {
                success: false,
                response: this.getErrorFallback(message),
                error: error.message,
                executionTime: `${Date.now() - startTime}ms`
            };
        }
    }

    /**
     * Execute a single agent
     */
    async executeAgent(agentName, sharedContext, requestId) {
        const agent = this.agents[agentName];
        if (!agent) {
            logger.warn(`Agent ${agentName} not found`);
            return null;
        }

        const agentStart = Date.now();
        logger.info(`🤖 [${requestId}] Running ${agentName.toUpperCase()}`);

        // Start observability trace
        const { runId } = await observabilityService.startAgentRun(agentName, {
            query: sharedContext.userQuery,
            intent: sharedContext.intent,
            requestId
        }, { requestId, complexity: sharedContext.intent?.complexity });

        try {
            const prompt = this.buildAgentPrompt(agentName, sharedContext);
            
            let response;
            if (agent.generateResponse) {
                response = await Promise.race([
                    agent.generateResponse(prompt),
                    this.timeoutPromise(20000, `${agentName} timeout`)
                ]);
            }

            const duration = Date.now() - agentStart;
            logger.success(`✓ ${agentName} done (${duration}ms)`);

            // End observability trace with success
            await observabilityService.endAgentRun(runId, {
                response: response?.substring(0, 500), // Limit size for tracing
                duration,
                success: true
            });

            return {
                name: agentName.charAt(0).toUpperCase() + agentName.slice(1),
                icon: agent.icon || '🤖',
                response: response,
                duration,
                traceId: runId
            };

        } catch (error) {
            logger.warn(`${agentName} failed: ${error.message}`);
            // Log error to observability
            await observabilityService.endAgentRun(runId, null, error);
            return null;
        }
    }

    /**
     * Generate the final formatted response
     */
    async generateFinalResponse(message, intent, sharedContext, agentResults, requestId) {
        logger.info(`📝 [${requestId}] Generating final response`);

        const agentOutputs = sharedContext.getAllAgentOutputs();
        
        // If we have a communicator output, use it as base
        if (agentOutputs.communicator && typeof agentOutputs.communicator === 'string') {
            return this.formatResponse(agentOutputs.communicator, intent);
        }

        // If we have strategist output (most common for financial advice)
        if (agentOutputs.strategist && typeof agentOutputs.strategist === 'string') {
            return this.formatResponse(agentOutputs.strategist, intent);
        }

        // If only one agent was used, return its output
        if (agentResults.length === 1 && agentResults[0]?.response) {
            const resp = agentResults[0].response;
            return this.formatResponse(typeof resp === 'string' ? resp : JSON.stringify(resp), intent);
        }

        // Multiple agents - synthesize with OpenAI if available
        if (openaiService.isAvailable() && Object.keys(agentOutputs).length > 1) {
            try {
                const synthesisPrompt = this.buildSynthesisPrompt(message, intent, agentOutputs);
                
                const response = await openaiService.chat([
                    { role: 'system', content: this.getSynthesisSystemPrompt() },
                    { role: 'user', content: synthesisPrompt }
                ], { temperature: 0.7, maxTokens: 1500 });

                if (response && typeof response === 'string') {
                    return response;
                }
            } catch (error) {
                logger.warn('Synthesis failed, using fallback');
            }
        }

        // Fallback - return first available agent output
        for (const result of agentResults) {
            if (result?.response) {
                const resp = result.response;
                return this.formatResponse(typeof resp === 'string' ? resp : JSON.stringify(resp), intent);
            }
        }

        // Ultimate fallback
        return this.getIntentBasedFallback(intent);
    }

    /**
     * Format response for clean presentation
     */
    formatResponse(response, intent) {
        if (!response) return this.getIntentBasedFallback(intent);
        
        // Clean up response - remove excessive newlines, fix formatting
        let cleaned = response
            .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
            .replace(/^\s+/gm, '')        // Remove leading spaces
            .trim();

        return cleaned;
    }

    /**
     * Build synthesis prompt for multi-agent responses
     */
    buildSynthesisPrompt(message, intent, agentOutputs) {
        return `USER QUESTION: ${message}

INTENT: ${intent.primary_intent}

=== AGENT ANALYSES ===
${Object.entries(agentOutputs).map(([agent, output]) => {
    const text = typeof output === 'string' ? output : JSON.stringify(output);
    return `\n[${agent.toUpperCase()}]:\n${text.substring(0, 1200)}`;
}).join('\n')}

=== YOUR TASK ===
Create ONE clear, comprehensive response that:
1. Directly answers the question with specific numbers/recommendations
2. Combines insights from all agents coherently
3. Uses clean formatting with headers and bullet points
4. Provides actionable next steps
5. Uses ₹ for currency, references Indian financial products

Keep the response focused and well-structured. Don't repeat information.`;
    }

    /**
     * System prompt for synthesis
     */
    getSynthesisSystemPrompt() {
        return `You are AURA, an expert AI financial advisor for Indian investors. 

CRITICAL FORMATTING RULES:
- DO NOT start with greetings like "Hey", "Hello", "Hi there", etc.
- Start DIRECTLY with the answer or a brief context statement
- Use markdown formatting: **bold** for headers, bullet points for lists
- Keep responses concise and scannable
- Use ₹ for all currency amounts

Your responses should be:
- Direct and actionable with specific numbers
- Well-formatted with clear sections
- Focused on Indian financial context (₹, NSE/BSE, Indian tax laws)
- Professional but approachable tone
- Include specific recommendations

End with ONE helpful follow-up question.`;
    }

    /**
     * Intent Analysis - Determines complexity and required agents
     */
    async analyzeIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        const intentSignals = {
            portfolio_planning: 0,
            calculation: 0,
            market_insight: 0,
            tax_planning: 0,
            general_advice: 0
        };
        
        // Portfolio/Goal planning
        const portfolioKeywords = ['goal', 'build', 'corpus', 'years', 'invest', 'monthly', 'sip', 'portfolio', 'wealth', 'retire', 'plan', 'lakh', 'crore', 'save', 'accumulate', 'future'];
        portfolioKeywords.forEach(kw => {
            if (lowerMessage.includes(kw)) intentSignals.portfolio_planning += 2;
        });
        if (lowerMessage.match(/\d+\s*(year|yr)/)) intentSignals.portfolio_planning += 4;
        if (lowerMessage.match(/₹?\d+[kKlLcC]?\s*(per |every )?month/)) intentSignals.portfolio_planning += 4;
        if (lowerMessage.includes('how should i invest')) intentSignals.portfolio_planning += 5;
        if (lowerMessage.includes('how much') && lowerMessage.includes('need')) intentSignals.portfolio_planning += 4;
        
        // Age-based planning (complex)
        if (lowerMessage.match(/\d+\s*(year|yr).*old/)) intentSignals.portfolio_planning += 5;
        
        // Calculation
        const calcKeywords = ['calculate', 'xirr', 'cagr', 'return', 'projection', 'compound', 'emi', 'interest'];
        calcKeywords.forEach(kw => {
            if (lowerMessage.includes(kw)) intentSignals.calculation += 3;
        });
        
        // Market insight
        const marketKeywords = ['market', 'nifty', 'sensex', 'stock', 'today', 'index', 'correction', 'rally'];
        marketKeywords.forEach(kw => {
            if (lowerMessage.includes(kw)) intentSignals.market_insight += 3;
        });
        
        // Tax planning
        const taxKeywords = ['tax', '80c', '80d', 'ltcg', 'stcg', 'deduction', 'elss', 'section'];
        taxKeywords.forEach(kw => {
            if (lowerMessage.includes(kw)) intentSignals.tax_planning += 3;
        });
        
        // General advice / Simple questions
        const simpleKeywords = ['what is', 'what are', 'how does', 'explain', 'define', 'meaning of', 'tell me about'];
        const isSimpleDefinition = simpleKeywords.some(kw => lowerMessage.startsWith(kw)) && message.length < 40;
        
        simpleKeywords.forEach(kw => {
            if (lowerMessage.includes(kw)) intentSignals.general_advice += 2;
        });
        
        // Boost general advice for very simple questions
        if (isSimpleDefinition) {
            intentSignals.general_advice += 8;
        }
        
        // Determine primary intent
        let primaryIntent = 'general_advice';
        let maxScore = 0;
        
        Object.entries(intentSignals).forEach(([intent, score]) => {
            if (score > maxScore) {
                maxScore = score;
                primaryIntent = intent;
            }
        });
        
        // Agent routing based on intent - MORE AGENTS for better answers
        const routingMatrix = {
            portfolio_planning: ['realist', 'quant', 'strategist', 'doer', 'communicator'],
            calculation: ['quant', 'strategist', 'doer'],
            market_insight: ['realist', 'strategist', 'communicator'],
            tax_planning: ['strategist', 'quant', 'doer', 'communicator'],
            general_advice: ['strategist', 'quant', 'communicator']
        };
        
        let requiredAgents = routingMatrix[primaryIntent] || routingMatrix.general_advice;
        
        // Determine complexity - more generous thresholds
        let complexity = 'medium'; // Default to medium for better answers
        const wordCount = message.split(' ').length;
        
        // Check for personal financial details (always complex)
        const hasPersonalDetails = /\d+\s*(year|yr).*old|earning|salary|income|saving|lakh|crore|month|year.*old/i.test(lowerMessage);
        const hasMultipleNumbers = (message.match(/\d+/g) || []).length >= 2;
        
        // Very simple definitional questions = simple (but still use 2 agents)
        if (isSimpleDefinition && !hasPersonalDetails) {
            complexity = 'simple';
            requiredAgents = ['strategist', 'communicator']; // At least 2 agents
        } else if (hasPersonalDetails || hasMultipleNumbers || maxScore >= 6 || wordCount > 15) {
            // Personal planning questions = ALWAYS complex with all 5 agents
            complexity = 'complex';
            requiredAgents = ['realist', 'quant', 'strategist', 'doer', 'communicator'];
        } else if (maxScore >= 4 || wordCount > 8) {
            complexity = 'medium';
            requiredAgents = requiredAgents.slice(0, 4);
        }
        
        logger.info(`🧠 Intent Analysis: ${primaryIntent} | Score: ${maxScore} | Words: ${wordCount} | HasPersonal: ${hasPersonalDetails}`);
        
        return {
            primary_intent: primaryIntent,
            required_agents: requiredAgents,
            complexity,
            confidence: Math.min(maxScore / 10, 1).toFixed(2)
        };
    }

    /**
     * Build agent-specific prompt
     */
    buildAgentPrompt(agentName, sharedContext) {
        // Format chat history if available (last few messages for context)
        let chatHistoryContext = '';
        if (sharedContext.chatHistory && sharedContext.chatHistory.length > 0) {
            const recentHistory = sharedContext.chatHistory.slice(-6); // Last 6 messages for immediate context
            chatHistoryContext = `\nPREVIOUS CONVERSATION:\n${recentHistory.map(m => 
                `${m.role.toUpperCase()}: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`
            ).join('\n')}\n`;
        }
        
        const baseContext = `USER QUERY: ${sharedContext.userQuery}

INTENT: ${sharedContext.intent?.primary_intent || 'general'}
${chatHistoryContext}
MARKET CONTEXT:
${sharedContext.marketData?.indices ? 
    sharedContext.marketData.indices.slice(0, 3).map(i => 
        `- ${i.name}: ${i.value} (${i.positive ? '+' : ''}${i.changePercent}%)`
    ).join('\n') : 'Market data unavailable'}

${sharedContext.ragContext ? `KNOWLEDGE BASE:\n${sharedContext.ragContext.substring(0, 800)}\n` : ''}
${sharedContext.agentOutputs.size > 0 ? sharedContext.toPromptContext() : ''}`;

        const instructions = {
            realist: `As the REALIST agent, provide:
1. Current market conditions
2. Realistic return expectations
3. Risk factors to consider
Be grounded and factual.`,

            quant: `As the QUANT agent, provide:
1. Specific calculations (SIP projections, CAGR, corpus estimates)
2. Multiple return scenarios (conservative 10%, moderate 12%, aggressive 15%)
3. Numbers in Indian format (lakhs/crores)
Show your math clearly.`,

            strategist: `As the STRATEGIST agent, provide:
1. Clear asset allocation recommendation
2. Specific product suggestions (fund types, not names)
3. Tax optimization strategies
4. Risk management approach
Be strategic and actionable.`,

            doer: `As the DOER agent, provide:
1. Step-by-step implementation guide
2. Specific platforms (Zerodha, Groww, Kuvera, etc.)
3. Documents needed
4. Timeline for execution
Make everything immediately actionable.`,

            communicator: `As the COMMUNICATOR agent, synthesize all insights into:
1. Clear executive summary
2. Key recommendations in priority order
3. Actionable next steps
4. Encouraging closing message
Be warm, clear, and motivating.`
        };

        return `${baseContext}

${instructions[agentName] || 'Provide helpful financial advice.'}

Use ₹ for currency. Reference Indian financial products and regulations.
Be specific with numbers and recommendations.`;
    }

    /**
     * Intent-based fallback responses
     */
    getIntentBasedFallback(intent) {
        const fallbacks = {
            portfolio_planning: `**Investment Strategy for Your Goals**

Based on your investment goals, here's a strategic approach:

**Recommended Asset Allocation:**
- **Equity (60-70%)**: For long-term growth
  - Nifty 50 Index Fund: 40%
  - Flexi Cap Fund: 20%
  - Mid Cap Fund: 10%
- **Debt (20-30%)**: For stability
  - Short Duration Fund or Corporate Bond Fund
- **Gold (5-10%)**: For diversification
  - Sovereign Gold Bonds (2.5% interest + capital appreciation)

**Tax Optimization:**
- Maximize ₹1.5L in Section 80C via ELSS
- Additional ₹50,000 in NPS under 80CCD(1B)

**Key Principles:**
• Start with emergency fund (6 months expenses)
• Use SIPs for rupee cost averaging
• Review and rebalance annually

**Next Steps:**
1. Open a demat account on Zerodha/Groww
2. Start SIPs on the 1st of each month
3. Set up auto-debit for discipline

Would you like me to calculate specific SIP amounts for your target corpus?`,

            calculation: `**Financial Calculations**

Here are key calculations for your reference:

**SIP Growth Projections (₹10,000/month):**
- At 10% CAGR: ₹23L in 10 years, ₹76L in 20 years
- At 12% CAGR: ₹26L in 10 years, ₹1Cr in 20 years
- At 15% CAGR: ₹31L in 10 years, ₹1.5Cr in 20 years

**Key Benchmarks (Historical):**
- Nifty 50: ~12-14% CAGR (long-term)
- Large Cap Funds: 10-14%
- Mid Cap Funds: 12-16%
- Small Cap Funds: 14-20% (higher risk)

**Rule of 72:**
At 12% returns, your money doubles every 6 years.

Share your specific numbers and I'll calculate exact projections!`,

            tax_planning: `**Tax Optimization Guide (FY 2024-25)**

**Section 80C (₹1.5L limit):**
- ELSS Funds - Best for growth + tax saving (3-year lock-in)
- PPF - Safe, 7.1% tax-free returns (15-year lock-in)
- EPF contributions
- Life insurance premiums

**Section 80CCD(1B):**
Additional ₹50,000 deduction for NPS investments

**Section 80D (Health Insurance):**
- Self/Family: Up to ₹25,000
- Parents (60+): Up to ₹50,000

**Capital Gains Tax:**
- LTCG (>1 year): 10% above ₹1L exemption
- STCG (<1 year): 15%

**Pro Tip:** Invest in ELSS early in the financial year to maximize tax-free growth!

Would you like a personalized tax-saving plan?`,

            general_advice: `**Financial Advice**

Here are key principles for building wealth:

**Foundation First:**
1. Emergency fund: 6 months of expenses in liquid funds
2. Health insurance: ₹10L+ cover for family
3. Term insurance: 10-15x annual income

**Investment Approach:**
- Start with SIPs (even ₹500/month matters!)
- Diversify across equity, debt, and gold
- Focus on low-cost index funds
- Stay invested for 10+ years

**Quick Wins:**
• Automate investments via SIP auto-debit
• Increase SIP by 10% every year
• Review portfolio annually, not daily

**Platforms to Consider:**
- Zerodha/Groww: Stocks & MF
- Kuvera: Direct MF (zero commission)
- smallcase: Thematic portfolios

What specific aspect would you like to explore?`
        };

        return fallbacks[intent?.primary_intent] || fallbacks.general_advice;
    }

    /**
     * Error fallback response
     */
    getErrorFallback(message) {
        return `I apologize, but I encountered an issue processing your request. 

Here's general guidance while I recover:

**For Investment Questions:**
• Consider a diversified portfolio: 60% equity, 30% debt, 10% gold
• Start with index funds for simplicity
• Use SIPs for rupee cost averaging

**Recommended Platforms:**
• Zerodha, Groww, or Kuvera for investments
• Check AMC websites for direct mutual funds

Please try rephrasing your question, or ask about:
- SIP calculations
- Tax saving options
- Portfolio allocation
- Retirement planning`;
    }

    /**
     * Timeout promise helper
     */
    timeoutPromise(ms, message) {
        return new Promise((_, reject) => 
            setTimeout(() => reject(new Error(message)), ms)
        );
    }

    // ==================== PORTFOLIO ANALYSIS (Original functionality) ====================
    
    async analyzePortfolio(userId, phoneNumber, progressCallback = () => {}) {
        const startTime = Date.now();
        
        logger.divider();
        logger.info('🚀 Starting portfolio analysis', { userId, phoneNumber });

        try {
            progressCallback({ stage: "Collecting Financial Data", progress: 10, agent: "Realist", icon: "📈" });
            
            const realTimeData = await this.executeAgentWithTimeout(
                () => this.agents.realist.fetchRealTimeData(phoneNumber),
                'Realist - Data Collection'
            );

            progressCallback({ stage: "Performing Quantitative Analysis", progress: 30, agent: "Quant", icon: "🔢" });
            
            const quantAnalysis = await this.executeAgentWithTimeout(
                () => this.agents.quant.performQuantitativeAnalysis(realTimeData?.userFinancialData),
                'Quant - Analysis'
            );

            progressCallback({ stage: "Creating Strategic Plan", progress: 50, agent: "Strategist", icon: "🎯" });
            
            const userProfile = this.createUserProfile(realTimeData?.userFinancialData);
            const goals = this.extractGoals(realTimeData?.userFinancialData);
            
            const strategy = await this.executeAgentWithTimeout(
                () => this.agents.strategist.generatePersonalizedPlan(userProfile, realTimeData?.userFinancialData, goals),
                'Strategist - Planning'
            );

            progressCallback({ stage: "Building Action Plan", progress: 70, agent: "Doer", icon: "⚡" });
            
            const actionPlan = await this.executeAgentWithTimeout(
                () => this.agents.doer.createActionPlan(strategy, quantAnalysis, realTimeData?.userFinancialData),
                'Doer - Action Planning'
            );

            progressCallback({ stage: "Preparing Insights", progress: 85, agent: "Communicator", icon: "💬" });
            
            const communication = await this.executeAgentWithTimeout(
                () => this.agents.communicator.generateUserCommunication(quantAnalysis, strategy, actionPlan, userProfile),
                'Communicator - Communication'
            );

            progressCallback({ stage: "Finalizing Analysis", progress: 95, agent: "Orchestrator", icon: "🔮" });

            const finalAnalysis = {
                success: true,
                timestamp: new Date().toISOString(),
                executionTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
                userId,
                phoneNumber,
                realTimeData,
                quantAnalysis,
                strategy,
                actionPlan,
                communication,
                summary: this.generateAnalysisSummary(quantAnalysis, strategy, actionPlan),
                agentActivity: [
                    { name: "Realist", icon: "📈", status: "complete", activity: "Fetched real-time data" },
                    { name: "Quant", icon: "🔢", status: "complete", activity: "Performed analysis" },
                    { name: "Strategist", icon: "🎯", status: "complete", activity: "Created strategy" },
                    { name: "Doer", icon: "⚡", status: "complete", activity: "Built action plan" },
                    { name: "Communicator", icon: "💬", status: "complete", activity: "Prepared insights" }
                ]
            };

            progressCallback({ stage: "Analysis Complete", progress: 100, agent: "Complete", icon: "✅" });
            return finalAnalysis;

        } catch (error) {
            logger.error('Portfolio analysis failed', error);
            return { success: false, error: error.message };
        }
    }

    async executeAgentWithTimeout(agentFunction, agentName) {
        return new Promise(async (resolve) => {
            const timeoutId = setTimeout(() => {
                logger.warn(`${agentName} timed out`);
                resolve(null);
            }, this.timeout);

            try {
                const result = await agentFunction();
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                logger.error(`${agentName} error`, error);
                resolve(null);
            }
        });
    }

    createUserProfile(financialData) {
        if (!financialData) {
            return {
                age: 30,
                riskTolerance: 'Moderate',
                monthlyIncome: 75000,
                monthlyExpenses: 45000,
                investmentExperience: 'Intermediate'
            };
        }

        const netWorth = financialData.netWorth?.total_net_worth || 0;
        const creditScore = financialData.creditReport?.credit_score || 700;
        
        let riskTolerance = 'Moderate';
        if (netWorth > 5000000 && creditScore > 750) {
            riskTolerance = 'Aggressive';
        } else if (netWorth < 500000 || creditScore < 650) {
            riskTolerance = 'Conservative';
        }

        return {
            age: 30,
            riskTolerance,
            monthlyIncome: 75000,
            monthlyExpenses: 45000,
            investmentExperience: netWorth > 1000000 ? 'Experienced' : 'Intermediate',
            netWorth,
            creditScore
        };
    }

    extractGoals(financialData) {
        const goals = [];
        const netWorth = financialData?.netWorth?.total_net_worth || 0;
        
        if (netWorth < 500000) {
            goals.push('Build emergency fund');
            goals.push('Start systematic investing');
        }
        
        goals.push('Tax optimization');
        goals.push('Retirement planning');
        
        if (netWorth > 2000000) {
            goals.push('Portfolio diversification');
        }
        
        return goals;
    }

    generateAnalysisSummary(quantAnalysis, strategy, actionPlan) {
        return {
            headline: 'Portfolio analysis complete',
            keyInsights: [
                quantAnalysis?.insights?.[0] || 'Portfolio analyzed',
                strategy?.recommendations?.[0] || 'Diversification recommended'
            ]
        };
    }
}

export default AgentOrchestrator;
