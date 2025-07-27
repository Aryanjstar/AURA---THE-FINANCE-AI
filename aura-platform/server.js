import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

// Import our agent modules
import { StrategistAgent } from "./agents/strategist.js";
import { QuantAgent } from "./agents/quant.js";
import { DoerAgent } from "./agents/doer.js";
import { RealistAgent } from "./agents/realist.js";
import { CommunicatorAgent } from "./agents/communicator.js";
import { AgentOrchestrator } from "./orchestrator/agent-orchestrator.js";
import { FiMCPClient } from "./services/fi-mcp-client.js";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
try {
	// For development, we'll use a minimal config
	// In production, you should use proper service account credentials
	if (!admin.apps.length) {
		admin.initializeApp({
			credential: admin.credential.cert({
				projectId: "aura-financial-platform",
				privateKey:
					process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ||
					"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VH4...dummy...\n-----END PRIVATE KEY-----\n",
				clientEmail:
					process.env.FIREBASE_CLIENT_EMAIL ||
					"firebase-adminsdk-dummy@aura-financial-platform.iam.gserviceaccount.com",
			}),
		});
	}
} catch (error) {
	console.warn(
		"⚠️ Firebase Admin initialization failed (using development mode):",
		error.message
	);
}

// In-memory user store (In production, use a proper database)
const userProfiles = new Map();

// Available phone numbers from Fi MCP
const availablePhoneNumbers = [
	"1010101010",
	"1111111111",
	"1212121212",
	"1313131313",
	"1414141414",
	"2020202020",
	"2121212121",
	"2222222222",
	"2525252525",
	"3333333333",
	"4444444444",
	"5555555555",
	"6666666666",
	"7777777777",
	"8888888888",
	"9999999999",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

// Security middleware
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
				fontSrc: ["'self'", "https://fonts.gstatic.com"],
				imgSrc: ["'self'", "data:", "https:"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
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

// Initialize agents and orchestrator
const fiMCPClient = new FiMCPClient();
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

// API Routes
app.get("/api/health", (req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		services: {
			fiMCP: fiMCPClient.isConnected(),
			agents: Object.keys(orchestrator.agents),
		},
	});
});

app.post("/api/analyze-portfolio", async (req, res) => {
	try {
		const user = await getAuthenticatedUser(req);
		const { userId } = req.body;

		if (!user) {
			return res.status(401).json({ error: "Authentication required" });
		}

		if (!user.phoneNumber) {
			return res
				.status(400)
				.json({ error: "Phone number not linked to account" });
		}

		const analysis = await orchestrator.analyzePortfolio(
			userId || user.uid,
			user.phoneNumber
		);
		res.json(analysis);
	} catch (error) {
		console.error("Portfolio analysis error:", error);
		res.status(500).json({
			error: "Failed to analyze portfolio",
			details: error.message,
		});
	}
});

app.post("/api/get-recommendations", async (req, res) => {
	try {
		const user = await getAuthenticatedUser(req);
		const { userId, riskProfile, goals } = req.body;

		if (!user) {
			return res.status(401).json({ error: "Authentication required" });
		}

		if (!user.phoneNumber) {
			return res
				.status(400)
				.json({ error: "Phone number not linked to account" });
		}

		const recommendations = await orchestrator.getRecommendations({
			userId: userId || user.uid,
			phoneNumber: user.phoneNumber,
			riskProfile,
			goals,
		});

		res.json(recommendations);
	} catch (error) {
		console.error("Recommendations error:", error);
		res.status(500).json({
			error: "Failed to get recommendations",
			details: error.message,
		});
	}
});

app.post("/api/fi-mcp/authenticate", async (req, res) => {
	try {
		const { phoneNumber } = req.body;
		const authResult = await fiMCPClient.authenticate(phoneNumber);
		res.json(authResult);
	} catch (error) {
		console.error("Authentication error:", error);
		res.status(500).json({
			error: "Authentication failed",
			details: error.message,
		});
	}
});

app.get("/api/fi-mcp/tools", async (req, res) => {
	try {
		const tools = await fiMCPClient.listTools();
		res.json(tools);
	} catch (error) {
		console.error("Tools listing error:", error);
		res.status(500).json({
			error: "Failed to list tools",
			details: error.message,
		});
	}
});

// Dashboard API Routes for Fi MCP data
app.post("/api/fi-mcp/fetch-net-worth", async (req, res) => {
	try {
		const { phone_number } = req.body;
		console.log(`📊 Fetching net worth for ${phone_number}`);
		
		const result = await fiMCPClient.callTool("fetch_net_worth", { phone_number });
		res.json(result);
	} catch (error) {
		console.error("Net worth fetch error:", error);
		res.status(500).json({
			error: "Failed to fetch net worth",
			details: error.message,
		});
	}
});

app.post("/api/fi-mcp/fetch-bank-transactions", async (req, res) => {
	try {
		const { phone_number } = req.body;
		console.log(`💳 Fetching bank transactions for ${phone_number}`);
		
		const result = await fiMCPClient.callTool("fetch_bank_transactions", { phone_number });
		res.json(result);
	} catch (error) {
		console.error("Bank transactions fetch error:", error);
		res.status(500).json({
			error: "Failed to fetch bank transactions",
			details: error.message,
		});
	}
});

app.post("/api/fi-mcp/fetch-mf-transactions", async (req, res) => {
	try {
		const { phone_number } = req.body;
		console.log(`📈 Fetching MF transactions for ${phone_number}`);
		
		const result = await fiMCPClient.callTool("fetch_mf_transactions", { phone_number });
		res.json(result);
	} catch (error) {
		console.error("MF transactions fetch error:", error);
		res.status(500).json({
			error: "Failed to fetch MF transactions",
			details: error.message,
		});
	}
});

app.post("/api/fi-mcp/fetch-stock-transactions", async (req, res) => {
	try {
		const { phone_number } = req.body;
		console.log(`📊 Fetching stock transactions for ${phone_number}`);
		
		const result = await fiMCPClient.callTool("fetch_stock_transactions", { phone_number });
		res.json(result);
	} catch (error) {
		console.error("Stock transactions fetch error:", error);
		res.status(500).json({
			error: "Failed to fetch stock transactions",
			details: error.message,
		});
	}
});

app.post("/api/fi-mcp/fetch-credit-report", async (req, res) => {
	try {
		const { phone_number } = req.body;
		console.log(`💳 Fetching credit report for ${phone_number}`);
		
		const result = await fiMCPClient.callTool("fetch_credit_report", { phone_number });
		res.json(result);
	} catch (error) {
		console.error("Credit report fetch error:", error);
		res.status(500).json({
			error: "Failed to fetch credit report",
			details: error.message,
		});
	}
});

app.post("/api/fi-mcp/fetch-epf-details", async (req, res) => {
	try {
		const { phone_number } = req.body;
		console.log(`🏦 Fetching EPF details for ${phone_number}`);
		
		const result = await fiMCPClient.callTool("fetch_epf_details", { phone_number });
		res.json(result);
	} catch (error) {
		console.error("EPF details fetch error:", error);
		res.status(500).json({
			error: "Failed to fetch EPF details",
			details: error.message,
		});
	}
});

// Authentication API Routes
app.post("/api/auth/verify-token", async (req, res) => {
	try {
		const { idToken, userData } = req.body;

		let decodedToken;
		try {
			// Verify Firebase token
			decodedToken = await admin.auth().verifyIdToken(idToken);
		} catch (firebaseError) {
			console.warn(
				"⚠️ Firebase token verification failed (development mode):",
				firebaseError.message
			);
			// In development mode, create a mock decoded token
			decodedToken = {
				uid: userData.uid || `dev_${Date.now()}`,
				email: userData.email || "dev@example.com",
				name: userData.displayName || "Development User",
			};
		}

		// Check if user profile exists
		let userProfile = userProfiles.get(decodedToken.uid);

		if (!userProfile) {
			// Create new user profile
			userProfile = {
				uid: decodedToken.uid,
				email: decodedToken.email || userData.email,
				displayName: decodedToken.name || userData.displayName,
				photoURL: userData.photoURL,
				phoneNumber: null,
				availableNumbers: availablePhoneNumbers,
				createdAt: new Date().toISOString(),
				lastLoginAt: new Date().toISOString(),
			};
			userProfiles.set(decodedToken.uid, userProfile);
		} else {
			// Update last login time
			userProfile.lastLoginAt = new Date().toISOString();
		}

		console.log(
			`✅ User authenticated: ${userProfile.displayName} (${userProfile.email})`
		);

		res.json({
			uid: userProfile.uid,
			email: userProfile.email,
			displayName: userProfile.displayName,
			phoneNumber: userProfile.phoneNumber,
			availableNumbers: userProfile.availableNumbers,
		});
	} catch (error) {
		console.error("❌ Token verification error:", error);
		res.status(401).json({
			error: "Invalid token",
			details: error.message,
		});
	}
});

app.post("/api/auth/get-profile", async (req, res) => {
	try {
		const { idToken } = req.body;

		let decodedToken;
		try {
			decodedToken = await admin.auth().verifyIdToken(idToken);
		} catch (firebaseError) {
			console.warn("⚠️ Firebase token verification failed (development mode)");
			// Return empty profile for development
			return res.status(401).json({ error: "Invalid token" });
		}

		const userProfile = userProfiles.get(decodedToken.uid);

		if (!userProfile) {
			return res.status(404).json({ error: "User profile not found" });
		}

		res.json({
			uid: userProfile.uid,
			email: userProfile.email,
			displayName: userProfile.displayName,
			phoneNumber: userProfile.phoneNumber,
			availableNumbers: userProfile.availableNumbers,
		});
	} catch (error) {
		console.error("❌ Get profile error:", error);
		res.status(500).json({
			error: "Failed to get profile",
			details: error.message,
		});
	}
});

app.post("/api/auth/update-profile", async (req, res) => {
	try {
		const { idToken, phoneNumber } = req.body;

		let decodedToken;
		try {
			decodedToken = await admin.auth().verifyIdToken(idToken);
		} catch (firebaseError) {
			console.warn("⚠️ Firebase token verification failed (development mode)");
			// Create mock token for development
			decodedToken = { uid: `dev_${Date.now()}` };
		}

		const userProfile = userProfiles.get(decodedToken.uid);

		if (!userProfile) {
			return res.status(404).json({ error: "User profile not found" });
		}

		// Validate phone number
		if (!phoneNumber || phoneNumber.length !== 10) {
			return res.status(400).json({ error: "Invalid phone number" });
		}

		// Check if phone number is in available list
		if (!availablePhoneNumbers.includes(phoneNumber)) {
			return res.status(400).json({
				error: "Phone number not available in demo accounts",
				availableNumbers: availablePhoneNumbers,
			});
		}

		// Update user profile
		userProfile.phoneNumber = phoneNumber;
		userProfile.updatedAt = new Date().toISOString();

		console.log(
			`📱 Phone number linked: ${userProfile.displayName} -> ${phoneNumber}`
		);

		res.json({
			uid: userProfile.uid,
			email: userProfile.email,
			displayName: userProfile.displayName,
			phoneNumber: userProfile.phoneNumber,
			availableNumbers: userProfile.availableNumbers,
		});
	} catch (error) {
		console.error("❌ Update profile error:", error);
		res.status(500).json({
			error: "Failed to update profile",
			details: error.message,
		});
	}
});

// Helper function to get authenticated user
async function getAuthenticatedUser(req) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return null;
	}

	const idToken = authHeader.split("Bearer ")[1];

	try {
		const decodedToken = await admin.auth().verifyIdToken(idToken);
		return userProfiles.get(decodedToken.uid);
	} catch (error) {
		console.warn("⚠️ Auth header verification failed:", error.message);
		return null;
	}
}

// Chat API with Intelligent Agent Orchestration
app.post("/api/chat", async (req, res) => {
	try {
		const { message, sessionId } = req.body;
		const user = await getAuthenticatedUser(req);

		if (!message) {
			return res.status(400).json({ error: "Message is required" });
		}

		console.log(`💬 Chat request - Session: ${sessionId}, Message: ${message}`);

		// Process the chat message through intelligent agent orchestration
		const chatResponse = await processChatMessage(message, sessionId, user);

		res.json({
			success: true,
			response: chatResponse.response,
			sessionId: chatResponse.sessionId,
			agentActivity: chatResponse.agentActivity,
		});
	} catch (error) {
		console.error("Chat error:", error);
		res.status(500).json({
			error: "Failed to process chat message",
			details: error.message,
		});
	}
});

// Chat Message Processing with Intelligent Agent Orchestration
async function processChatMessage(message, sessionId, user = null) {
	const currentSessionId =
		sessionId ||
		`chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	try {
		// Step 1: Validate if query is finance-related using Gemini
		const isFinanceRelated = await validateFinanceDomain(message);

		if (!isFinanceRelated) {
			return {
				response:
					"I specialize in financial analysis and planning. Please ask questions related to investments, portfolio management, financial planning, or market analysis. I'm here to help you make informed financial decisions!",
				sessionId: currentSessionId,
				agentActivity: [],
			};
		}

		// Step 2: Analyze user intent and determine required agents
		const intentAnalysis = await analyzeUserIntent(message);

		// Step 3: Get phone number from authenticated user or extract from message
		let phoneNumber = null;
		if (user && user.phoneNumber) {
			phoneNumber = user.phoneNumber;
			console.log(`📞 Using authenticated user's phone: ${phoneNumber}`);
		} else {
			// Fallback to extracting from message for backward compatibility
			phoneNumber = extractPhoneNumber(message);
			if (phoneNumber) {
				console.log(`📞 Phone number detected in message: ${phoneNumber}`);
			}
		}

		// Step 4: Fetch relevant Fi MCP data if phone number is available
		let fiData = null;
		if (phoneNumber) {
			console.log(`📊 Fetching financial data for user...`);
			fiData = await fetchUserFinancialData(phoneNumber);
		}

		// Step 5: Orchestrate agents based on intent
		const agentResponses = await orchestrateAgentsForChat(
			intentAnalysis,
			message,
			fiData,
			user
		);

		// Step 6: Generate final response using Communicator agent
		const finalResponse = await generateFinalChatResponse(
			message,
			intentAnalysis,
			agentResponses,
			fiData,
			user
		);

		return {
			response: finalResponse,
			sessionId: currentSessionId,
			agentActivity: agentResponses.map((agent) => ({
				name: agent.name,
				icon: agent.icon,
				status: "complete",
				activity: agent.activity,
			})),
		};
	} catch (error) {
		console.error("Chat processing error:", error);
		return {
			response:
				"I apologize for the technical difficulty. Please try rephrasing your question or contact support if the issue persists.",
			sessionId: currentSessionId,
			agentActivity: [],
		};
	}
}

// Industry-Level System Prompts
const SYSTEM_PROMPTS = {
	DOMAIN_VALIDATOR: `You are AURA's domain validation system. Your sole purpose is to determine if a user query is related to finance, investments, or financial planning.

FINANCIAL DOMAINS INCLUDE:
- Portfolio analysis, performance, returns, XIRR, CAGR
- Investment planning, asset allocation, diversification
- Stock market, mutual funds, ETFs, bonds, commodities
- Financial goals, retirement planning, tax planning
- Risk assessment, volatility, Sharpe ratio
- Banking, loans, credit, insurance
- Market analysis, economic indicators
- Personal finance, budgeting, savings

RESPOND WITH:
- "YES" if the query relates to any financial topic
- "NO" if the query is about other topics (weather, sports, general knowledge, etc.)

Be strict but not overly restrictive. Finance-adjacent topics like economic news or business questions should be "YES".`,

	INTENT_ANALYZER: `You are AURA's intent analysis system. Analyze user queries to determine what financial assistance they need.

AGENT CAPABILITIES:
- STRATEGIST: Financial planning, goal setting, asset allocation strategies
- QUANT: Mathematical analysis, XIRR, CAGR, volatility, risk metrics  
- DOER: Actionable recommendations, specific investment suggestions, execution steps
- REALIST: Market data, portfolio performance, real-time analysis
- COMMUNICATOR: Explanations, education, personalized insights

ANALYZE the user query and return JSON:
{
  "primary_intent": "portfolio_analysis|investment_planning|performance_review|market_inquiry|general_advice",
  "required_agents": ["strategist", "quant", "doer", "realist", "communicator"],
  "complexity": "simple|moderate|complex",
  "data_needed": ["portfolio_data", "market_data", "user_profile", "none"],
  "response_type": "analysis|recommendation|explanation|data_summary"
}`,

	FINAL_RESPONSE_GENERATOR: `You are AURA's Communication Agent - the final interface between our AI financial team and the user.

YOUR ROLE:
- Synthesize insights from multiple AI agents into coherent, actionable advice
- Maintain a professional yet approachable tone
- Provide specific, actionable recommendations when possible
- Explain complex financial concepts in simple terms
- Always prioritize user's financial well-being

RESPONSE STRUCTURE:
1. Direct answer to user's question
2. Key insights from agent analysis  
3. Specific recommendations (if applicable)
4. Next steps or follow-up suggestions

TONE: Professional, trustworthy, educational, optimistic but realistic
FORMAT: Use markdown for formatting, bullet points for clarity, emoji sparingly for engagement`,
};

// Domain validation using Gemini
async function validateFinanceDomain(message) {
	try {
		const prompt = `${SYSTEM_PROMPTS.DOMAIN_VALIDATOR}\n\nUser Query: "${message}"\n\nResponse:`;

		const response = await communicatorAgent.generateResponse(prompt, {
			temperature: 0.1,
			maxTokens: 10,
		});

		return response.toLowerCase().includes("yes");
	} catch (error) {
		console.error("Domain validation error:", error);
		// Default to true to avoid blocking legitimate queries
		return true;
	}
}

// Intent analysis using Gemini
async function analyzeUserIntent(message) {
	try {
		const prompt = `${SYSTEM_PROMPTS.INTENT_ANALYZER}\n\nUser Query: "${message}"\n\nProvide JSON analysis:`;

		const response = await strategistAgent.generateResponse(prompt, {
			temperature: 0.3,
			maxTokens: 200,
		});

		// Parse JSON response
		const jsonMatch = response.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}

		// Fallback intent analysis
		return {
			primary_intent: "general_advice",
			required_agents: ["strategist", "communicator"],
			complexity: "simple",
			data_needed: ["none"],
			response_type: "explanation",
		};
	} catch (error) {
		console.error("Intent analysis error:", error);
		return {
			primary_intent: "general_advice",
			required_agents: ["strategist", "communicator"],
			complexity: "simple",
			data_needed: ["none"],
			response_type: "explanation",
		};
	}
}

// Extract phone number from message
function extractPhoneNumber(message) {
	const phoneRegex = /\b\d{10}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
	const match = message.match(phoneRegex);
	return match ? match[0].replace(/[-.\s]/g, "") : null;
}

// Fetch user financial data from Fi MCP
async function fetchUserFinancialData(phoneNumber) {
	try {
		console.log(`📊 Fetching financial data for ${phoneNumber}...`);

		const [netWorth, transactions, mfTransactions, stockTransactions] =
			await Promise.allSettled([
				fiMCPClient.callTool("fetch_net_worth", { phone_number: phoneNumber }),
				fiMCPClient.callTool("fetch_bank_transactions", {
					phone_number: phoneNumber,
				}),
				fiMCPClient.callTool("fetch_mf_transactions", {
					phone_number: phoneNumber,
				}),
				fiMCPClient.callTool("fetch_stock_transactions", {
					phone_number: phoneNumber,
				}),
			]);

		return {
			netWorth: netWorth.status === "fulfilled" ? netWorth.value : null,
			bankTransactions:
				transactions.status === "fulfilled" ? transactions.value : null,
			mfTransactions:
				mfTransactions.status === "fulfilled" ? mfTransactions.value : null,
			stockTransactions:
				stockTransactions.status === "fulfilled"
					? stockTransactions.value
					: null,
			phoneNumber,
		};
	} catch (error) {
		console.error("Fi MCP data fetch error:", error);
		return null;
	}
}

// Orchestrate agents based on intent
async function orchestrateAgentsForChat(
	intentAnalysis,
	message,
	fiData,
	user = null
) {
	const agentResponses = [];
	const requiredAgents = intentAnalysis.required_agents || [
		"strategist",
		"communicator",
	];

	try {
		// Process agents in parallel for efficiency
		const agentPromises = requiredAgents.map(async (agentName) => {
			try {
				let response, activity;

				switch (agentName) {
					case "strategist":
						if (fiData) {
							response = await strategistAgent.generatePersonalizedPlan(
								message,
								fiData
							);
							activity = "Generated personalized financial strategy";
						} else {
							response = await strategistAgent.generateResponse(
								`As a financial strategist, provide advice for: ${message}`
							);
							activity = "Provided strategic financial guidance";
						}
						return { name: "Strategist", icon: "🎯", response, activity };

					case "quant":
						if (fiData && (fiData.mfTransactions || fiData.stockTransactions)) {
							response = await quantAgent.performQuantitativeAnalysis(fiData);
							activity = "Performed quantitative portfolio analysis";
						} else {
							response = await quantAgent.generateResponse(
								`Provide quantitative analysis for: ${message}`
							);
							activity = "Provided quantitative insights";
						}
						return { name: "Quant", icon: "🔢", response, activity };

					case "doer":
						response = await doerAgent.createActionPlan(message, fiData);
						activity = "Created actionable implementation plan";
						return { name: "Doer", icon: "⚡", response, activity };

					case "realist":
						if (fiData) {
							response = await realistAgent.fetchRealTimeData(
								fiData.phoneNumber
							);
							activity = "Fetched real-time market data";
						} else {
							response = await realistAgent.generateResponse(
								`Provide market reality check for: ${message}`
							);
							activity = "Provided market insights";
						}
						return { name: "Realist", icon: "📈", response, activity };

					case "communicator":
						response = await communicatorAgent.generateUserCommunication(
							message,
							fiData
						);
						activity = "Personalized communication";
						return { name: "Communicator", icon: "💬", response, activity };

					default:
						return null;
				}
			} catch (error) {
				console.error(`Agent ${agentName} error:`, error);
				return {
					name: agentName,
					icon: "⚠️",
					response: "Agent temporarily unavailable",
					activity: "Error occurred",
				};
			}
		});

		const results = await Promise.allSettled(agentPromises);
		results.forEach((result) => {
			if (result.status === "fulfilled" && result.value) {
				agentResponses.push(result.value);
			}
		});
	} catch (error) {
		console.error("Agent orchestration error:", error);
	}

	return agentResponses;
}

// Generate final response using Communicator
async function generateFinalChatResponse(
	message,
	intentAnalysis,
	agentResponses,
	fiData,
	user = null
) {
	try {
		let context = `USER QUERY: "${message}"\n\n`;

		if (fiData) {
			context += `USER DATA AVAILABLE: Net worth, transaction history, portfolio data\n\n`;
		}

		context += "AGENT INSIGHTS:\n";
		agentResponses.forEach((agent) => {
			context += `${agent.name}: ${agent.response}\n\n`;
		});

		const prompt = `${SYSTEM_PROMPTS.FINAL_RESPONSE_GENERATOR}\n\n${context}\n\nProvide a comprehensive, helpful response that synthesizes the agent insights:`;

		const response = await communicatorAgent.generateResponse(prompt, {
			temperature: 0.7,
			maxTokens: 500,
		});

		return response;
	} catch (error) {
		console.error("Final response generation error:", error);
		return "I've analyzed your query and our AI agents are working on providing you with comprehensive insights. Please try again in a moment.";
	}
}

// Socket.IO for real-time communication
io.on("connection", (socket) => {
	console.log("Client connected:", socket.id);

	socket.on("join-room", (userId) => {
		socket.join(userId);
		console.log(`User ${userId} joined room`);
	});

	socket.on("request-analysis", async (data) => {
		try {
			const { userId, phoneNumber } = data;

			// Emit progress updates
			socket.emit("analysis-progress", {
				stage: "Connecting to Fi MCP",
				progress: 20,
			});

			const analysis = await orchestrator.analyzePortfolio(
				userId,
				phoneNumber,
				(progress) => {
					socket.emit("analysis-progress", progress);
				}
			);

			socket.emit("analysis-complete", analysis);
		} catch (error) {
			socket.emit("analysis-error", { error: error.message });
		}
	});

	socket.on("disconnect", () => {
		console.log("Client disconnected:", socket.id);
	});
});

// Serve the main app
app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
	console.log(`🚀 AURA Platform server running on port ${PORT}`);
	console.log(`📊 Dashboard: http://localhost:${PORT}`);

	// Initialize Fi MCP connection
	try {
		await fiMCPClient.initialize();
		console.log("✅ Fi MCP Client initialized");
	} catch (error) {
		console.error("❌ Fi MCP Client initialization failed:", error.message);
	}
});
