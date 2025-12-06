/**
 * MongoDB Service - Database Integration for AURA
 * Provides data persistence for users, chat history, and financial data
 */

import mongoose from 'mongoose';
import { logger } from './logger.js';

// MongoDB Connection URI - defaults to local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aura_finance';

// ============== SCHEMAS ==============

// User Schema
const userSchema = new mongoose.Schema({
    // Auth info
    email: { type: String, unique: true, sparse: true },
    phoneNumber: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ['google', 'email', 'phone', 'demo'], default: 'email' },
    firebaseUid: { type: String, unique: true, sparse: true },
    
    // Profile
    displayName: String,
    photoURL: String,
    
    // Onboarding data
    onboardingComplete: { type: Boolean, default: false },
    age: Number,
    monthlyIncome: Number,
    monthlyExpenses: Number,
    currentSavings: Number,
    currentInvestments: Number,
    existingLoans: Number,
    riskTolerance: { type: String, enum: ['conservative', 'moderate', 'aggressive'], default: 'moderate' },
    investmentGoals: [String],
    investmentHorizon: String,
    
    // Financial data cache (from Fi MCP)
    financialDataCache: {
        netWorth: mongoose.Schema.Types.Mixed,
        transactions: mongoose.Schema.Types.Mixed,
        mutualFunds: mongoose.Schema.Types.Mixed,
        stocks: mongoose.Schema.Types.Mixed,
        creditReport: mongoose.Schema.Types.Mixed,
        epf: mongoose.Schema.Types.Mixed,
        lastUpdated: Date
    },
    
    // Settings
    preferences: {
        notifications: { type: Boolean, default: true },
        darkMode: { type: Boolean, default: true },
        language: { type: String, default: 'en' }
    },
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLoginAt: Date
});

// Chat History Schema
const chatHistorySchema = new mongoose.Schema({
    userId: { type: String, index: true }, // Can be email, phone, or Firebase UID
    sessionId: { type: String, required: true, unique: true, index: true },
    title: { type: String, default: 'New Chat' },
    
    messages: [{
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        
        // Agent metadata (for assistant messages)
        agentsUsed: [String],
        intent: String,
        complexity: String,
        executionTime: String
    }],
    
    // Session metadata
    startedAt: { type: Date, default: Date.now },
    lastMessageAt: { type: Date, default: Date.now },
    messageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
});

// Portfolio Analysis Schema (cached analyses)
const analysisSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phoneNumber: String,
    
    // Analysis results
    quantAnalysis: mongoose.Schema.Types.Mixed,
    strategy: mongoose.Schema.Types.Mixed,
    actionPlan: mongoose.Schema.Types.Mixed,
    summary: mongoose.Schema.Types.Mixed,
    
    // Metadata
    createdAt: { type: Date, default: Date.now },
    executionTime: String
});

// ============== MODELS ==============

const User = mongoose.model('User', userSchema);
const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
const Analysis = mongoose.model('Analysis', analysisSchema);

// ============== SERVICE CLASS ==============

class MongoDBService {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxAttempts = 3;
    }

    async connect() {
        if (this.isConnected) {
            return true;
        }

        try {
            this.connectionAttempts++;
            logger.info(`🔌 Connecting to MongoDB (attempt ${this.connectionAttempts}/${this.maxAttempts})...`);
            
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            });
            
            this.isConnected = true;
            logger.success(`✅ MongoDB connected: ${MONGODB_URI.split('@').pop() || 'localhost'}`);
            
            // Handle connection events
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err);
                this.isConnected = false;
            });
            
            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
                this.isConnected = false;
            });
            
            return true;
        } catch (error) {
            logger.warn(`MongoDB connection failed: ${error.message}`);
            
            if (this.connectionAttempts < this.maxAttempts) {
                logger.info('Retrying MongoDB connection in 2 seconds...');
                await new Promise(r => setTimeout(r, 2000));
                return this.connect();
            }
            
            logger.warn('📦 MongoDB unavailable - running without database persistence');
            return false;
        }
    }

    // ============== USER METHODS ==============

    async createUser(userData) {
        if (!this.isConnected) return null;
        
        try {
            const user = new User({
                ...userData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            await user.save();
            logger.info(`👤 User created: ${user.email || user.phoneNumber}`);
            return user;
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key - user exists, update instead
                return this.updateUser(userData.email || userData.phoneNumber, userData);
            }
            logger.error('Error creating user:', error);
            return null;
        }
    }

    async findUser(identifier) {
        if (!this.isConnected) return null;
        
        try {
            return await User.findOne({
                $or: [
                    { email: identifier },
                    { phoneNumber: identifier },
                    { firebaseUid: identifier }
                ]
            });
        } catch (error) {
            logger.error('Error finding user:', error);
            return null;
        }
    }

    async updateUser(identifier, updateData) {
        if (!this.isConnected) return null;
        
        try {
            const user = await User.findOneAndUpdate(
                {
                    $or: [
                        { email: identifier },
                        { phoneNumber: identifier },
                        { firebaseUid: identifier }
                    ]
                },
                {
                    ...updateData,
                    updatedAt: new Date()
                },
                { new: true, upsert: true }
            );
            logger.info(`👤 User updated: ${identifier}`);
            return user;
        } catch (error) {
            logger.error('Error updating user:', error);
            return null;
        }
    }

    async updateFinancialCache(identifier, financialData) {
        if (!this.isConnected) return null;
        
        try {
            return await User.findOneAndUpdate(
                {
                    $or: [
                        { email: identifier },
                        { phoneNumber: identifier }
                    ]
                },
                {
                    financialDataCache: {
                        ...financialData,
                        lastUpdated: new Date()
                    },
                    updatedAt: new Date()
                },
                { new: true }
            );
        } catch (error) {
            logger.error('Error updating financial cache:', error);
            return null;
        }
    }

    // ============== CHAT HISTORY METHODS ==============

    // Maximum messages to keep for context (configurable)
    static MAX_CONTEXT_MESSAGES = 20;

    async saveMessage(sessionId, message, userId = null) {
        if (!this.isConnected) return null;
        
        try {
            let chatHistory = await ChatHistory.findOne({ sessionId });
            
            if (!chatHistory) {
                chatHistory = new ChatHistory({
                    sessionId,
                    userId,
                    messages: [],
                    startedAt: new Date()
                });
            }
            
            chatHistory.messages.push({
                ...message,
                timestamp: new Date()
            });
            chatHistory.lastMessageAt = new Date();
            chatHistory.messageCount = chatHistory.messages.length;
            
            await chatHistory.save();
            return chatHistory;
        } catch (error) {
            logger.error('Error saving message:', error);
            return null;
        }
    }

    async getChatHistory(sessionId) {
        if (!this.isConnected) return [];
        
        try {
            const history = await ChatHistory.findOne({ sessionId });
            return history?.messages || [];
        } catch (error) {
            logger.error('Error getting chat history:', error);
            return [];
        }
    }

    /**
     * Get recent messages for context (last N messages)
     * Used to provide chat context to AI
     */
    async getRecentContext(sessionId, maxMessages = 20) {
        if (!this.isConnected) return [];
        
        try {
            const history = await ChatHistory.findOne({ sessionId });
            if (!history?.messages) return [];
            
            // Return last N messages for context
            const messages = history.messages.slice(-maxMessages);
            return messages.map(m => ({
                role: m.role,
                content: m.content
            }));
        } catch (error) {
            logger.error('Error getting chat context:', error);
            return [];
        }
    }

    /**
     * Create a new chat session
     */
    async createNewChat(userId = null, title = null) {
        if (!this.isConnected) return null;
        
        try {
            const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const chatHistory = new ChatHistory({
                sessionId,
                userId,
                title: title || `Chat ${new Date().toLocaleDateString()}`,
                messages: [],
                startedAt: new Date(),
                lastMessageAt: new Date(),
                messageCount: 0
            });
            
            await chatHistory.save();
            logger.info(`💬 New chat created: ${sessionId}`);
            return { sessionId, chatHistory };
        } catch (error) {
            logger.error('Error creating new chat:', error);
            return null;
        }
    }

    /**
     * Clear chat messages (keep the session)
     */
    async clearChat(sessionId) {
        if (!this.isConnected) return false;
        
        try {
            await ChatHistory.findOneAndUpdate(
                { sessionId },
                {
                    messages: [],
                    messageCount: 0,
                    lastMessageAt: new Date()
                }
            );
            logger.info(`🗑️ Chat cleared: ${sessionId}`);
            return true;
        } catch (error) {
            logger.error('Error clearing chat:', error);
            return false;
        }
    }

    /**
     * Delete a chat session entirely
     */
    async deleteChat(sessionId) {
        if (!this.isConnected) return false;
        
        try {
            await ChatHistory.findOneAndDelete({ sessionId });
            logger.info(`🗑️ Chat deleted: ${sessionId}`);
            return true;
        } catch (error) {
            logger.error('Error deleting chat:', error);
            return false;
        }
    }

    /**
     * Get all chat sessions for a user
     */
    async getUserChatSessions(userId, limit = 10) {
        if (!this.isConnected) return [];
        
        try {
            const sessions = await ChatHistory.find({ userId })
                .sort({ lastMessageAt: -1 })
                .limit(limit)
                .select('sessionId title startedAt lastMessageAt messageCount messages');
            
            // Get title from first user message if no title set
            return sessions.map(s => {
                let title = s.title;
                if (!title || title === 'New Chat') {
                    const firstUserMsg = s.messages?.find(m => m.role === 'user');
                    title = firstUserMsg?.content?.substring(0, 50) || 'Chat';
                }
                return {
                    sessionId: s.sessionId,
                    title,
                    startedAt: s.startedAt,
                    lastMessageAt: s.lastMessageAt,
                    messageCount: s.messageCount
                };
            });
        } catch (error) {
            logger.error('Error getting user chat sessions:', error);
            return [];
        }
    }
    
    /**
     * Get a specific chat session with all messages
     */
    async getChatSession(sessionId, userId = null) {
        if (!this.isConnected) return null;
        
        try {
            const query = { sessionId };
            if (userId) query.userId = userId; // Only allow access to own chats
            
            return await ChatHistory.findOne(query);
        } catch (error) {
            logger.error('Error getting chat session:', error);
            return null;
        }
    }

    // ============== ANALYSIS METHODS ==============

    async saveAnalysis(analysisData) {
        if (!this.isConnected) return null;
        
        try {
            const analysis = new Analysis(analysisData);
            await analysis.save();
            logger.info(`📊 Analysis saved for: ${analysisData.phoneNumber || 'user'}`);
            return analysis;
        } catch (error) {
            logger.error('Error saving analysis:', error);
            return null;
        }
    }

    async getLatestAnalysis(identifier) {
        if (!this.isConnected) return null;
        
        try {
            return await Analysis.findOne({
                $or: [
                    { phoneNumber: identifier },
                    { userId: identifier }
                ]
            }).sort({ createdAt: -1 });
        } catch (error) {
            logger.error('Error getting analysis:', error);
            return null;
        }
    }

    // ============== UTILITY METHODS ==============

    async healthCheck() {
        return {
            connected: this.isConnected,
            database: mongoose.connection.name || null,
            host: mongoose.connection.host || null
        };
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('MongoDB disconnected');
        }
    }
}

// Export singleton instance
export const mongodbService = new MongoDBService();
export { User, ChatHistory, Analysis };

