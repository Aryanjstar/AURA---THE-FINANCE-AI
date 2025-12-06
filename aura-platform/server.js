/**
 * AURA Financial Platform - Main Server
 * 
 * An advanced agentic AI platform for financial intelligence,
 * powered by Azure OpenAI GPT-4.1 with function calling, RAG, 
 * multi-agent orchestration, and Fi.Money MCP integration.
 * 
 * Built by Aryan Jaiswal
 * https://
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

// Import services
import { logger, apiLogger, chatLogger } from "./services/logger.js";
import { openaiService } from "./services/openai-service.js";
import { ragService } from "./services/rag-service.js";
import { marketDataService } from "./services/market-data-service.js";
import { FiMCPClient } from "./services/fi-mcp-client.js";
import { mongodbService } from "./services/mongodb-service.js";
import { observabilityService } from "./services/observability-service.js";

// Import agents
import { StrategistAgent } from "./agents/strategist.js";
import { QuantAgent } from "./agents/quant.js";
import { DoerAgent } from "./agents/doer.js";
import { RealistAgent } from "./agents/realist.js";
import { CommunicatorAgent } from "./agents/communicator.js";
import { AgentOrchestrator } from "./orchestrator/agent-orchestrator.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Print startup banner
logger.divider('AURA FINANCIAL PLATFORM');
logger.info('Starting AURA - AI Financial Intelligence Platform');
logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Security middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://accounts.google.com", "https://apis.google.com"],
                frameSrc: ["'self'", "https://accounts.google.com"],
                connectSrc: ["'self'", "https://accounts.google.com", "https://www.googleapis.com", "https://oauth2.googleapis.com"],
            },
        },
    })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: "Too many requests from this IP, please try again later.",
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        apiLogger.api(req.method, req.path, res.statusCode, duration);
    });
    next();
});

// In-memory user store
const userProfiles = new Map();

// Available phone numbers for demo
const availablePhoneNumbers = [
    "1010101010", "1111111111", "1212121212", "1313131313", "1414141414",
    "2020202020", "2121212121", "2222222222", "2525252525", "3333333333",
    "4444444444", "5555555555", "6666666666", "7777777777", "8888888888", "9999999999"
];

// Initialize Fi MCP Client
const fiMCPClient = new FiMCPClient();

// Initialize agents
logger.info('Initializing AI agents...');
const strategistAgent = new StrategistAgent();
const quantAgent = new QuantAgent();
const doerAgent = new DoerAgent();
const realistAgent = new RealistAgent(fiMCPClient);
const communicatorAgent = new CommunicatorAgent();

const orchestrator = new AgentOrchestrator({
    strategist: strategistAgent,
    quant: quantAgent,
    doer: doerAgent,
    realist: realistAgent,
    communicator: communicatorAgent,
});

logger.success('AI agents initialized', { count: 5 });

// ============== API ROUTES ==============

// Health check
app.get("/api/health", async (req, res) => {
    const mongoStatus = await mongodbService.healthCheck();
    
    const status = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        services: {
            fiMCP: fiMCPClient.isConnected(),
            openAI: openaiService.isAvailable(),
            rag: ragService.getStatus().initialized,
            marketData: marketDataService.getStatus().marketStatus,
            mongodb: mongoStatus.connected,
            agents: Object.keys(orchestrator.agents),
        },
    };
    res.json(status);
});

// Observability metrics endpoint
app.get("/api/metrics", async (req, res) => {
    try {
        const metrics = await observabilityService.getMetricsSummary();
        const agentMetrics = observabilityService.getAgentMetrics();
        
        res.json({
            success: true,
            langsmith: metrics,
            agents: agentMetrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Metrics fetch error', error);
        res.json({
            success: false,
            error: error.message,
            langsmith: { enabled: false }
        });
    }
});

// ============== User API Endpoints ==============

// Save/Update user profile
app.post("/api/user/profile", async (req, res) => {
    try {
        const userData = req.body;
        const user = await mongodbService.createUser(userData);
        res.json({ success: true, user });
    } catch (error) {
        logger.error('User profile save error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user profile
app.get("/api/user/profile/:identifier", async (req, res) => {
    try {
        const user = await mongodbService.findUser(req.params.identifier);
        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, error: 'User not found' });
        }
    } catch (error) {
        logger.error('User profile fetch error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get chat history for a specific session
app.get("/api/chat/history/:sessionId", async (req, res) => {
    try {
        const messages = await mongodbService.getChatHistory(req.params.sessionId);
        res.json({ success: true, messages });
    } catch (error) {
        logger.error('Chat history fetch error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all chat sessions for a user
app.get("/api/chat/sessions/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const sessions = await mongodbService.getUserChatSessions(userId, 20);
        res.json({ success: true, sessions });
    } catch (error) {
        logger.error('User sessions fetch error', error);
        res.status(500).json({ success: false, error: error.message, sessions: [] });
    }
});

// Get a specific chat session with messages
app.get("/api/chat/session/:sessionId", async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userId } = req.query; // Optional - for security
        const session = await mongodbService.getChatSession(sessionId, userId);
        
        if (session) {
            res.json({ success: true, session });
        } else {
            res.json({ success: false, error: 'Session not found' });
        }
    } catch (error) {
        logger.error('Chat session fetch error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new chat session
app.post("/api/chat/new", async (req, res) => {
    try {
        const { userId, title } = req.body;
        const result = await mongodbService.createNewChat(userId, title);
        
        if (result) {
            res.json({ 
                success: true, 
                sessionId: result.sessionId,
                chat: result.chatHistory 
            });
        } else {
            // If MongoDB not connected, still return a session ID
            const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            res.json({ success: true, sessionId, fromMemory: true });
        }
    } catch (error) {
        logger.error('New chat creation error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear chat messages
app.post("/api/chat/clear/:sessionId", async (req, res) => {
    try {
        const success = await mongodbService.clearChat(req.params.sessionId);
        res.json({ success });
    } catch (error) {
        logger.error('Chat clear error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete chat session
app.delete("/api/chat/:sessionId", async (req, res) => {
    try {
        const success = await mongodbService.deleteChat(req.params.sessionId);
        res.json({ success });
    } catch (error) {
        logger.error('Chat delete error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all user chat sessions
app.get("/api/chat/sessions/:userId", async (req, res) => {
    try {
        const sessions = await mongodbService.getUserChatSessions(req.params.userId, 20);
        res.json({ success: true, sessions });
    } catch (error) {
        logger.error('Chat sessions fetch error', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// System status
app.get("/api/status", async (req, res) => {
    res.json({
        platform: 'AURA Financial Intelligence',
        version: '2.0.0',
        developer: 'Aryan Jaiswal',
        website: 'https://aryanjaiswal.in',
        services: {
            openai: openaiService.getStatus(),
            rag: ragService.getStatus(),
            market: marketDataService.getStatus(),
            mcp: fiMCPClient.getStatus()
        },
        agents: orchestrator.getAgentStatus()
    });
});

// ============== MARKET DATA APIs ==============

app.get("/api/market/overview", async (req, res) => {
    try {
        logger.market('API request: Market overview');
        // Support force refresh via query parameter
        const forceRefresh = req.query.refresh ? true : false;
        const overview = await marketDataService.getMarketOverview(forceRefresh);
        res.json({ success: true, data: overview });
    } catch (error) {
        logger.error('Market overview failed', error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/market/indices", async (req, res) => {
    try {
        const indices = await marketDataService.fetchIndices();
        res.json({ success: true, data: indices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/market/currency", async (req, res) => {
    try {
        const currency = await marketDataService.fetchCurrencyRates();
        res.json({ success: true, data: currency });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/market/news", async (req, res) => {
    try {
        const news = await marketDataService.fetchNews();
        res.json({ success: true, data: news });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/market/sectors", async (req, res) => {
    try {
        const sectors = await marketDataService.fetchSectorPerformance();
        res.json({ success: true, data: sectors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== Fi MCP APIs ==============

app.post("/api/fi-mcp/fetch-net-worth", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching net worth for ${phone_number}`);
        
        const result = await fiMCPClient.callTool("fetch_net_worth", { phone_number });
        res.json(result);
    } catch (error) {
        logger.error('Net worth fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/fi-mcp/fetch-bank-transactions", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching bank transactions for ${phone_number}`);
        
        const result = await fiMCPClient.callTool("fetch_bank_transactions", { phone_number });
        res.json(result);
    } catch (error) {
        logger.error('Bank transactions fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/fi-mcp/fetch-mf-transactions", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching MF transactions for ${phone_number}`);
        
        const result = await fiMCPClient.callTool("fetch_mf_transactions", { phone_number });
        res.json(result);
    } catch (error) {
        logger.error('MF transactions fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/fi-mcp/fetch-stock-transactions", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching stock transactions for ${phone_number}`);
        
        const result = await fiMCPClient.callTool("fetch_stock_transactions", { phone_number });
        res.json(result);
    } catch (error) {
        logger.error('Stock transactions fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/fi-mcp/fetch-credit-report", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching credit report for ${phone_number}`);
        
        const result = await fiMCPClient.callTool("fetch_credit_report", { phone_number });
        res.json(result);
    } catch (error) {
        logger.error('Credit report fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/fi-mcp/fetch-epf-details", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching EPF details for ${phone_number}`);
        
        const result = await fiMCPClient.callTool("fetch_epf_details", { phone_number });
        res.json(result);
    } catch (error) {
        logger.error('EPF details fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all financial data at once
app.post("/api/fi-mcp/fetch-all", async (req, res) => {
    try {
        const { phone_number } = req.body;
        logger.mcp(`Fetching all financial data for ${phone_number}`);
        
        const [netWorth, transactions, mfData, stockData, creditReport, epfDetails] = await Promise.allSettled([
            fiMCPClient.callTool("fetch_net_worth", { phone_number }),
            fiMCPClient.callTool("fetch_bank_transactions", { phone_number }),
            fiMCPClient.callTool("fetch_mf_transactions", { phone_number }),
            fiMCPClient.callTool("fetch_stock_transactions", { phone_number }),
            fiMCPClient.callTool("fetch_credit_report", { phone_number }),
            fiMCPClient.callTool("fetch_epf_details", { phone_number })
        ]);
        
        res.json({
            success: true,
            data: {
                netWorth: netWorth.status === 'fulfilled' ? netWorth.value : null,
                transactions: transactions.status === 'fulfilled' ? transactions.value : null,
                mutualFunds: mfData.status === 'fulfilled' ? mfData.value : null,
                stocks: stockData.status === 'fulfilled' ? stockData.value : null,
                creditReport: creditReport.status === 'fulfilled' ? creditReport.value : null,
                epf: epfDetails.status === 'fulfilled' ? epfDetails.value : null
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Bulk data fetch error', error);
        res.status(500).json({ error: error.message });
    }
});

// ============== RAG APIs ==============

app.post("/api/rag/search", async (req, res) => {
    try {
        const { query, topK = 3 } = req.body;
        logger.rag(`Search query: ${query}`);
        
        const results = await ragService.retrieve(query, topK);
        res.json({ success: true, results });
    } catch (error) {
        logger.error('RAG search error', error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/rag/categories", async (req, res) => {
    try {
        await ragService.initialize();
        const categories = ragService.getCategories();
        const docs = ragService.knowledgeBase.map(d => ({ id: d.id, title: d.title, category: d.category }));
        res.json({ success: true, categories, documents: docs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============== CHAT API ==============

/**
 * Main Chat Endpoint - Single comprehensive response
 * Runs agents in parallel, returns ONE well-formatted answer
 */
app.post("/api/chat", async (req, res) => {
    try {
        const { message, sessionId, socketId, userId } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }
        
        const requestId = `CHAT-${Date.now().toString(36).toUpperCase()}`;
        logger.info(`💬 [${requestId}] Chat: "${message.substring(0, 80)}..."`);
        
        const currentSessionId = sessionId || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get chat context (last 15-20 messages for context)
        const chatContext = await mongodbService.getRecentContext(currentSessionId, 20);
        logger.info(`📚 Chat context: ${chatContext.length} previous messages`);
        
        // Save user message to MongoDB
        await mongodbService.saveMessage(currentSessionId, {
            role: 'user',
            content: message
        }, userId);
        
        // Process chat with context and progress updates via Socket.IO
        const result = await orchestrator.processChat(message, { 
            chatHistory: chatContext,
            userId 
        }, (progress) => {
            if (socketId) {
                io.to(socketId).emit('chat-progress', {
                    requestId,
                    ...progress
                });
            }
        });
        
        // Save assistant response to MongoDB
        await mongodbService.saveMessage(currentSessionId, {
            role: 'assistant',
            content: result.response,
            agentsUsed: result.agentsUsed,
            intent: result.intent,
            complexity: result.complexity,
            executionTime: result.executionTime
        }, userId);
        
        // Return the response
        res.json({
            success: result.success,
            response: result.response,
            sessionId: currentSessionId,
            requestId,
            intent: result.intent,
            complexity: result.complexity,
            agentsUsed: result.agentsUsed || [],
            executionTime: result.executionTime,
            agentActivity: result.agentActivity || [],
            messageCount: chatContext.length + 2 // Include current Q&A
        });
        
    } catch (error) {
        logger.error('Chat error', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            response: "I apologize, but I encountered an issue. Please try rephrasing your question."
        });
    }
});

/**
 * Streaming Chat Endpoint - For real-time responses via SSE
 */
app.get("/api/chat/stream", async (req, res) => {
    const { message } = req.query;
    
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const requestId = `STREAM-${Date.now().toString(36).toUpperCase()}`;
    logger.info(`📡 [${requestId}] Streaming: "${message.substring(0, 50)}..."`);

    try {
        res.write(`data: ${JSON.stringify({ type: 'start', requestId })}\n\n`);

        const result = await orchestrator.processChat(
            decodeURIComponent(message), 
            {},
            (progress) => {
                res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
            }
        );

        // Send final response
        res.write(`data: ${JSON.stringify({ 
            type: 'response', 
            response: result.response,
            agentsUsed: result.agentsUsed,
            executionTime: result.executionTime
        })}\n\n`);

        res.write(`data: ${JSON.stringify({ type: 'complete', requestId })}\n\n`);
        res.end();

    } catch (error) {
        logger.error(`[${requestId}] Stream error`, error);
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
    }
});

// ============== AUTH APIs ==============

// In-memory store for registered users (email -> user data)
// In production, this should be a database
const registeredUsers = new Map();

// Simple hash function for password (in production, use bcrypt)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hash_' + Math.abs(hash).toString(16);
}

// Signup endpoint
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password, and name are required' });
        }
        
        // Check if user already exists in MongoDB
        const existingUser = await mongodbService.findUser(email.toLowerCase());
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
        }
        
        // Also check local cache
        if (registeredUsers.has(email.toLowerCase())) {
            return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
        }
        
        // Create new user
        const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const hashedPassword = simpleHash(password);
        
        const newUser = {
            uid,
            email: email.toLowerCase(),
            displayName: name,
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            hasCompletedOnboarding: false,
            onboardingData: null
        };
        
        // Store in local cache
        registeredUsers.set(email.toLowerCase(), newUser);
        
        // Store in userProfiles for compatibility
        userProfiles.set(uid, {
            ...newUser,
            phoneNumber: null,
            availableNumbers: availablePhoneNumbers
        });
        
        // Save to MongoDB
        await mongodbService.createUser({
            email: email.toLowerCase(),
            displayName: name,
            firebaseUid: uid,
            provider: 'email',
            passwordHash: hashedPassword,
            onboardingComplete: false,
            lastLoginAt: new Date()
        });
        
        logger.success(`New user registered: ${name} (${email}) - saved to MongoDB`);
        
        res.json({
            success: true,
            user: {
                uid: newUser.uid,
                email: newUser.email,
                displayName: newUser.displayName,
                createdAt: newUser.createdAt,
                hasCompletedOnboarding: false
            }
        });
    } catch (error) {
        logger.error('Signup error', error);
        res.status(500).json({ message: 'Failed to create account. Please try again.' });
    }
});

// Signin endpoint
app.post("/api/auth/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        
        // Check if user exists in local cache first
        let user = registeredUsers.get(email.toLowerCase());
        
        // If not in cache, check MongoDB
        if (!user) {
            const mongoUser = await mongodbService.findUser(email.toLowerCase());
            if (mongoUser) {
                user = {
                    uid: mongoUser.firebaseUid,
                    email: mongoUser.email,
                    displayName: mongoUser.displayName,
                    passwordHash: mongoUser.passwordHash,
                    hasCompletedOnboarding: mongoUser.onboardingComplete || false
                };
                // Add to local cache
                registeredUsers.set(email.toLowerCase(), user);
            }
        }
        
        if (!user) {
            return res.status(401).json({ message: 'No account found with this email. Please sign up first.' });
        }
        
        // Verify password
        const hashedPassword = simpleHash(password);
        if (user.passwordHash !== hashedPassword) {
            return res.status(401).json({ message: 'Incorrect password. Please try again.' });
        }
        
        // Update last login
        user.lastLoginAt = new Date().toISOString();
        
        // Update last login in MongoDB
        await mongodbService.updateUser(email.toLowerCase(), { lastLoginAt: new Date() });
        
        logger.success(`User signed in: ${user.displayName} (${email})`);
        
        res.json({
            success: true,
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                createdAt: user.createdAt,
                hasCompletedOnboarding: user.hasCompletedOnboarding || false
            }
        });
    } catch (error) {
        logger.error('Signin error', error);
        res.status(500).json({ message: 'Sign in failed. Please try again.' });
    }
});

// Update onboarding status
app.post("/api/auth/complete-onboarding", async (req, res) => {
    try {
        const { email, onboardingData } = req.body;
        
        // Update local cache
        const user = registeredUsers.get(email?.toLowerCase());
        if (user) {
            user.hasCompletedOnboarding = true;
            user.onboardingData = onboardingData;
            logger.success(`Onboarding completed for: ${user.displayName}`);
        }
        
        // Update MongoDB
        if (email) {
            await mongodbService.updateUser(email.toLowerCase(), {
                onboardingComplete: true,
                ...onboardingData,
                onboardingCompletedAt: new Date()
            });
            logger.success(`Onboarding saved to MongoDB for: ${email}`);
        }
        
        res.json({ success: true });
    } catch (error) {
        logger.error('Onboarding update error', error);
        res.status(500).json({ message: 'Failed to save onboarding data' });
    }
});

// Google OAuth endpoint
app.post("/api/auth/google", async (req, res) => {
    try {
        const { uid, email, displayName, photoURL } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        const emailLower = email.toLowerCase();
        let isNewUser = false;
        
        // Check if user exists in MongoDB
        let existingUser = await mongodbService.findUser(emailLower);
        
        // Also check local cache
        if (!existingUser) {
            const cachedUser = registeredUsers.get(emailLower);
            if (cachedUser) {
                existingUser = cachedUser;
            }
        }
        
        if (existingUser) {
            // Existing user - update last login
            logger.success(`Google signin: ${displayName} (${email})`);
            
            // Update MongoDB
            await mongodbService.updateUser(emailLower, {
                lastLoginAt: new Date(),
                photoURL: photoURL || existingUser.photoURL
            });
            
            res.json({
                success: true,
                isNewUser: false,
                user: {
                    uid: existingUser.firebaseUid || existingUser.uid || uid,
                    email: existingUser.email,
                    displayName: existingUser.displayName || displayName,
                    photoURL: photoURL || existingUser.photoURL,
                    hasCompletedOnboarding: existingUser.onboardingComplete || existingUser.hasCompletedOnboarding || false,
                    provider: 'google'
                }
            });
        } else {
            // New user - create account
            logger.success(`New Google signup: ${displayName} (${email})`);
            isNewUser = true;
            
            const newUser = {
                uid: uid,
                email: emailLower,
                displayName: displayName,
                photoURL: photoURL,
                provider: 'google',
                hasCompletedOnboarding: false,
                createdAt: new Date().toISOString()
            };
            
            // Store in local cache
            registeredUsers.set(emailLower, newUser);
            
            // Store in MongoDB
            await mongodbService.createUser({
                firebaseUid: uid,
                email: emailLower,
                displayName: displayName,
                photoURL: photoURL,
                provider: 'google',
                onboardingComplete: false,
                createdAt: new Date()
            });
            
            res.json({
                success: true,
                isNewUser: true,
                user: {
                    uid: uid,
                    email: emailLower,
                    displayName: displayName,
                    photoURL: photoURL,
                    hasCompletedOnboarding: false,
                    provider: 'google'
                }
            });
        }
    } catch (error) {
        logger.error('Google auth error', error);
        res.status(500).json({ message: 'Google authentication failed' });
    }
});

app.post("/api/auth/verify-token", async (req, res) => {
    try {
        const { idToken, userData } = req.body;
        
        // For demo, create user profile
        const uid = userData?.uid || `user_${Date.now()}`;
        
        let userProfile = userProfiles.get(uid);
        
        if (!userProfile) {
            userProfile = {
                uid,
                email: userData?.email || "demo@aura.ai",
                displayName: userData?.displayName || "Demo User",
                photoURL: userData?.photoURL,
                phoneNumber: null,
                availableNumbers: availablePhoneNumbers,
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
            };
            userProfiles.set(uid, userProfile);
        }
        
        logger.success(`User authenticated: ${userProfile.displayName}`);
        
        res.json({
            uid: userProfile.uid,
            email: userProfile.email,
            displayName: userProfile.displayName,
            phoneNumber: userProfile.phoneNumber,
            availableNumbers: userProfile.availableNumbers,
        });
    } catch (error) {
        logger.error('Auth error', error);
        res.status(401).json({ error: error.message });
    }
});

app.post("/api/auth/update-profile", async (req, res) => {
    try {
        const { idToken, phoneNumber, uid } = req.body;
        
        const userId = uid || `user_${Date.now()}`;
        let userProfile = userProfiles.get(userId);
        
        if (!userProfile) {
            userProfile = {
                uid: userId,
                email: "demo@aura.ai",
                displayName: "Demo User",
                availableNumbers: availablePhoneNumbers,
                createdAt: new Date().toISOString(),
            };
            userProfiles.set(userId, userProfile);
        }
        
        if (phoneNumber && availablePhoneNumbers.includes(phoneNumber)) {
            userProfile.phoneNumber = phoneNumber;
            logger.info(`Phone linked: ${phoneNumber}`);
        }
        
        res.json({
            uid: userProfile.uid,
            email: userProfile.email,
            displayName: userProfile.displayName,
            phoneNumber: userProfile.phoneNumber,
            availableNumbers: userProfile.availableNumbers,
        });
    } catch (error) {
        logger.error('Profile update error', error);
        res.status(500).json({ error: error.message });
    }
});

// ============== DOMAIN VALIDATION ==============
// Used by the orchestrator for quick domain checks

// Domain validation function - validates if query is finance-related
function validateFinanceDomain(message) {
    const financeKeywords = [
        'invest', 'stock', 'mutual fund', 'sip', 'portfolio', 'return', 'risk',
        'tax', '80c', 'ltcg', 'stcg', 'nifty', 'sensex', 'market', 'trading',
        'bank', 'loan', 'emi', 'fd', 'ppf', 'nps', 'epf', 'insurance', 'gold',
        'money', 'savings', 'budget', 'expense', 'income', 'salary', 'wealth',
        'retirement', 'goal', 'financial', 'credit', 'debt', 'interest',
        'save', 'lakh', 'crore', 'rupee', '₹', 'month', 'year', 'profit', 'loss',
        'fund', 'dividend', 'capital', 'growth', 'equity', 'bond', 'asset',
        'liability', 'networth', 'net worth', 'elss', 'fixed deposit', 'rd',
        'recurring', 'earn', 'spend', 'cost', 'price', 'rate', 'percent', '%'
    ];
    
    const lowerMessage = message.toLowerCase();
    return financeKeywords.some(keyword => lowerMessage.includes(keyword));
}

// ============== SOCKET.IO (Real-time Two-Phase System) ==============

io.on("connection", (socket) => {
    logger.info(`🔌 Socket connected: ${socket.id}`);
    
    // Join personal room for targeted updates
    socket.on("join-room", (userId) => {
        socket.join(userId);
        socket.join(socket.id); // Also join socket ID room for direct messages
        logger.info(`User ${userId} joined room`);
    });
    
    // Real-time chat
    socket.on("chat-message", async (data) => {
        const { message, sessionId } = data;
        const requestId = `WS-${Date.now().toString(36).toUpperCase()}`;
        
        logger.info(`💬 [${requestId}] WebSocket chat: "${message.substring(0, 50)}..."`);
        
        try {
            socket.emit("chat-start", { requestId, message: "Processing..." });
            
            const result = await orchestrator.processChat(message, {}, (progress) => {
                socket.emit("chat-progress", { requestId, ...progress });
            });
            
            // Send the response
            socket.emit("chat-response", {
                requestId,
                sessionId: sessionId || `chat_${Date.now()}`,
                response: result.response,
                intent: result.intent,
                complexity: result.complexity,
                agentsUsed: result.agentsUsed,
                executionTime: result.executionTime
            });
            
            socket.emit("chat-complete", { requestId });
            
        } catch (error) {
            logger.error(`[${requestId}] WebSocket chat error`, error);
            socket.emit("chat-error", { 
                requestId, 
                error: error.message,
                response: "I apologize, but I encountered an issue. Please try again."
            });
        }
    });
    
    // Portfolio analysis (existing functionality)
    socket.on("request-analysis", async (data) => {
        try {
            const { userId, phoneNumber } = data;
            
            socket.emit("analysis-progress", { stage: "Connecting to Fi MCP", progress: 20 });
            
            const analysis = await orchestrator.analyzePortfolio(userId, phoneNumber, (progress) => {
                socket.emit("analysis-progress", progress);
            });
            
            socket.emit("analysis-complete", analysis);
        } catch (error) {
            socket.emit("analysis-error", { error: error.message });
        }
    });
    
    socket.on("disconnect", () => {
        logger.info(`🔌 Socket disconnected: ${socket.id}`);
    });
});

// Serve frontend
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============== SERVER STARTUP ==============

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
    logger.divider('SERVER STARTED');
    logger.success(`🚀 AURA Platform running on port ${PORT}`);
    logger.info(`📊 Dashboard: http://localhost:${PORT}`);
    logger.info(`🔌 API Health: http://localhost:${PORT}/api/health`);
    
    // Initialize services
    try {
        await mongodbService.connect();
    } catch (error) {
        logger.warn('MongoDB initialization failed - running without persistence', { error: error.message });
    }
    
    try {
        await fiMCPClient.initialize();
        logger.success('Fi MCP Client connected');
    } catch (error) {
        logger.warn('Fi MCP Client initialization failed - using fallback', { error: error.message });
    }
    
    try {
        await ragService.initialize();
        logger.success('RAG Service initialized');
    } catch (error) {
        logger.warn('RAG Service initialization failed', { error: error.message });
    }
    
    if (openaiService.isAvailable()) {
        logger.success('Azure OpenAI Service available');
    } else {
        logger.warn('Azure OpenAI not configured - check AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY');
    }
    
    logger.divider();
    logger.info('🚀 AURA Financial Platform - Ready');
    logger.info('📱 Demo phones: 2222222222, 8888888888, 4444444444');
    logger.info('🔗 Fi.Money MCP: https://mcp.fi.money:8080');
    logger.info('👤 Built by Aryan Jaiswal - https://aryanjaiswal.in');
    logger.divider();
});

export { app, server };
