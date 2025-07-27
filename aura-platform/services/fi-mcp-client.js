import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

export class FiMCPClient {
	constructor() {
		this.baseUrl = process.env.FI_MCP_URL || "http://localhost:8080";
		this.streamUrl =
			process.env.FI_MCP_STREAM_URL || "http://localhost:8080/mcp/stream";
		this.sessionId = null;
		this.authenticated = false;
		this.availableTools = [];
		this.requestId = 1;
	}

	async initialize() {
		try {
			console.log("🔗 Initializing Fi MCP Client...");

			// Generate session ID
			this.sessionId = `mcp-session-${uuidv4()}`;
			console.log(`📋 Generated session ID: ${this.sessionId}`);

			// Test connection
			await this.testConnection();

			// List available tools
			await this.listTools();

			console.log("✅ Fi MCP Client initialized successfully");
			return true;
		} catch (error) {
			console.error("❌ Fi MCP Client initialization failed:", error.message);
			throw new Error(`Fi MCP initialization failed: ${error.message}`);
		}
	}

	async testConnection() {
		try {
			const response = await axios.post(
				this.streamUrl,
				{
					jsonrpc: "2.0",
					id: this.requestId++,
					method: "tools/list",
					params: {},
				},
				{
					headers: {
						"Content-Type": "application/json",
						"Mcp-Session-Id": this.sessionId,
					},
					timeout: 10000,
				}
			);

			if (
				response.data.error &&
				response.data.error.message === "Invalid session ID"
			) {
				console.log("🔑 Authentication required - session not found");
				return false;
			}

			console.log("✅ Fi MCP connection test successful");
			return true;
		} catch (error) {
			if (
				error.response?.status === 401 ||
				error.message.includes("Invalid session")
			) {
				console.log("🔑 Authentication required");
				return false;
			}
			console.error("❌ Fi MCP connection test failed:", error.message);
			throw error;
		}
	}

	async authenticate(phoneNumber) {
		try {
			console.log(`🔐 Authenticating with phone number: ${phoneNumber}`);

			// First, try to make a request to trigger authentication flow
			const response = await axios.post(
				this.streamUrl,
				{
					jsonrpc: "2.0",
					id: this.requestId++,
					method: "tools/list",
					params: {},
				},
				{
					headers: {
						"Content-Type": "application/json",
						"Mcp-Session-Id": this.sessionId,
					},
					timeout: 10000,
				}
			);

			// Check if we get a login URL
			if (
				response.data.error &&
				response.data.error.data &&
				response.data.error.data.login_url
			) {
				const loginUrl = response.data.error.data.login_url;
				console.log(`🌐 Login URL received: ${loginUrl}`);

				// Simulate authentication process
				// In a real application, this would redirect user to the login page
				// For demo purposes, we'll simulate the login
				await this.simulateLogin(loginUrl, phoneNumber);

				// Verify authentication
				const verifyResponse = await this.listTools();
				if (verifyResponse && verifyResponse.length > 0) {
					this.authenticated = true;
					console.log("✅ Authentication successful");
					return { success: true, loginUrl };
				}
			}

			return { success: false, error: "Authentication flow not triggered" };
		} catch (error) {
			console.error("❌ Authentication failed:", error.message);
			throw new Error(`Authentication failed: ${error.message}`);
		}
	}

	async simulateLogin(loginUrl, phoneNumber) {
		try {
			console.log(`🤖 Simulating login for phone: ${phoneNumber}`);

			// Extract session ID from login URL
			const urlParams = new URLSearchParams(loginUrl.split("?")[1]);
			const sessionId = urlParams.get("sessionId");

			if (sessionId) {
				this.sessionId = sessionId;
				console.log(`📋 Updated session ID: ${this.sessionId}`);
			}

			// In a real scenario, user would:
			// 1. Go to the login URL
			// 2. Enter phone number
			// 3. Enter OTP
			// 4. Complete authentication

			// For demo, we'll use one of the test phone numbers
			const testPhoneNumbers = [
				"1111111111",
				"2222222222",
				"3333333333",
				"4444444444",
				"5555555555",
				"6666666666",
				"7777777777",
				"8888888888",
				"9999999999",
				"1010101010",
				"1212121212",
				"1414141414",
				"1313131313",
				"2020202020",
				"2121212121",
				"2525252525",
			];

			// Use the provided phone number if it's a test number, otherwise use a default
			const usePhoneNumber = testPhoneNumbers.includes(phoneNumber)
				? phoneNumber
				: "2222222222";

			console.log(`📱 Using test phone number: ${usePhoneNumber} for demo`);

			// Simulate a small delay for authentication
			await new Promise((resolve) => setTimeout(resolve, 1000));

			return true;
		} catch (error) {
			console.error("❌ Login simulation failed:", error.message);
			throw error;
		}
	}

	async listTools() {
		try {
			console.log("📋 Listing available Fi MCP tools...");

			const response = await axios.post(
				this.streamUrl,
				{
					jsonrpc: "2.0",
					id: this.requestId++,
					method: "tools/list",
					params: {},
				},
				{
					headers: {
						"Content-Type": "application/json",
						"Mcp-Session-Id": this.sessionId,
					},
					timeout: 10000,
				}
			);

			if (response.data.error) {
				if (response.data.error.data && response.data.error.data.login_url) {
					console.log("🔑 Authentication required");
					return {
						requiresAuth: true,
						loginUrl: response.data.error.data.login_url,
					};
				}
				throw new Error(response.data.error.message);
			}

			if (response.data.result && response.data.result.tools) {
				this.availableTools = response.data.result.tools;
				console.log(`📊 Found ${this.availableTools.length} available tools:`);
				this.availableTools.forEach((tool) => {
					console.log(`  - ${tool.name}: ${tool.description}`);
				});
				return this.availableTools;
			}

			return [];
		} catch (error) {
			console.error("❌ Failed to list tools:", error.message);
			throw new Error(`Tool listing failed: ${error.message}`);
		}
	}

	async callTool(toolName, toolArguments = {}) {
		try {
			console.log(`🔧 Calling Fi MCP tool: ${toolName}`);

			const response = await axios.post(
				this.streamUrl,
				{
					jsonrpc: "2.0",
					id: this.requestId++,
					method: "tools/call",
					params: {
						name: toolName,
						arguments: toolArguments,
					},
				},
				{
					headers: {
						"Content-Type": "application/json",
						"Mcp-Session-Id": this.sessionId,
					},
					timeout: 15000,
				}
			);

			if (response.data.error) {
				if (response.data.error.data && response.data.error.data.login_url) {
					console.log("🔑 Authentication required for tool call");
					throw new Error("Authentication required");
				}
				throw new Error(`Tool call error: ${response.data.error.message}`);
			}

			if (response.data.result) {
				console.log(`✅ Tool ${toolName} executed successfully`);
				return response.data.result;
			}

			return null;
		} catch (error) {
			console.error(`❌ Tool call failed for ${toolName}:`, error.message);
			throw new Error(`Tool call failed: ${error.message}`);
		}
	}

	async fetchNetWorth() {
		try {
			return await this.callTool("fetch_net_worth");
		} catch (error) {
			console.error("❌ Net worth fetch failed:", error.message);
			throw error;
		}
	}

	async fetchBankTransactions() {
		try {
			return await this.callTool("fetch_bank_transactions");
		} catch (error) {
			console.error("❌ Bank transactions fetch failed:", error.message);
			throw error;
		}
	}

	async fetchMutualFundTransactions() {
		try {
			return await this.callTool("fetch_mutual_fund_transactions");
		} catch (error) {
			console.error("❌ Mutual fund transactions fetch failed:", error.message);
			throw error;
		}
	}

	async fetchCreditReport() {
		try {
			return await this.callTool("fetch_credit_report");
		} catch (error) {
			console.error("❌ Credit report fetch failed:", error.message);
			throw error;
		}
	}

	async fetchEPFDetails() {
		try {
			return await this.callTool("fetch_epf_details");
		} catch (error) {
			console.error("❌ EPF details fetch failed:", error.message);
			throw error;
		}
	}

	async fetchAllFinancialData() {
		try {
			console.log("📊 Fetching all financial data from Fi MCP...");

			const results = {};
			const errors = {};

			// Fetch all available data in parallel
			const fetchPromises = [
				this.fetchNetWorth()
					.then((data) => {
						results.netWorth = data;
					})
					.catch((err) => {
						errors.netWorth = err.message;
					}),
				this.fetchBankTransactions()
					.then((data) => {
						results.bankTransactions = data;
					})
					.catch((err) => {
						errors.bankTransactions = err.message;
					}),
				this.fetchMutualFundTransactions()
					.then((data) => {
						results.mutualFundTransactions = data;
					})
					.catch((err) => {
						errors.mutualFundTransactions = err.message;
					}),
				this.fetchCreditReport()
					.then((data) => {
						results.creditReport = data;
					})
					.catch((err) => {
						errors.creditReport = err.message;
					}),
				this.fetchEPFDetails()
					.then((data) => {
						results.epfDetails = data;
					})
					.catch((err) => {
						errors.epfDetails = err.message;
					}),
			];

			await Promise.allSettled(fetchPromises);

			console.log(
				`✅ Financial data fetch completed. Success: ${
					Object.keys(results).length
				}, Errors: ${Object.keys(errors).length}`
			);

			return {
				data: results,
				errors: errors,
				timestamp: new Date().toISOString(),
				successCount: Object.keys(results).length,
				errorCount: Object.keys(errors).length,
			};
		} catch (error) {
			console.error("❌ Bulk financial data fetch failed:", error.message);
			throw error;
		}
	}

	async testAllTools() {
		try {
			console.log("🧪 Testing all available Fi MCP tools...");

			const testResults = [];

			for (const tool of this.availableTools) {
				try {
					console.log(`🔍 Testing tool: ${tool.name}`);
					const result = await this.callTool(tool.name);
					testResults.push({
						tool: tool.name,
						status: "success",
						hasData: !!result,
						dataKeys: result ? Object.keys(result) : [],
					});
				} catch (error) {
					testResults.push({
						tool: tool.name,
						status: "error",
						error: error.message,
					});
				}
			}

			const successCount = testResults.filter(
				(r) => r.status === "success"
			).length;
			console.log(
				`📊 Tool testing completed: ${successCount}/${testResults.length} successful`
			);

			return testResults;
		} catch (error) {
			console.error("❌ Tool testing failed:", error.message);
			throw error;
		}
	}

	isConnected() {
		return this.sessionId !== null;
	}

	isAuthenticated() {
		return this.authenticated;
	}

	getAvailableTools() {
		return this.availableTools;
	}

	getSessionId() {
		return this.sessionId;
	}

	getStatus() {
		return {
			connected: this.isConnected(),
			authenticated: this.isAuthenticated(),
			sessionId: this.sessionId,
			availableTools: this.availableTools.length,
			baseUrl: this.baseUrl,
			streamUrl: this.streamUrl,
		};
	}

	// Utility method to validate phone number format
	validatePhoneNumber(phoneNumber) {
		const testPhoneNumbers = [
			"1111111111",
			"2222222222",
			"3333333333",
			"4444444444",
			"5555555555",
			"6666666666",
			"7777777777",
			"8888888888",
			"9999999999",
			"1010101010",
			"1212121212",
			"1414141414",
			"1313131313",
			"2020202020",
			"2121212121",
			"2525252525",
		];

		if (testPhoneNumbers.includes(phoneNumber)) {
			return { valid: true, type: "test", description: "Test phone number" };
		}

		if (/^\d{10}$/.test(phoneNumber)) {
			return {
				valid: true,
				type: "production",
				description: "Valid phone number format",
			};
		}

		return {
			valid: false,
			error: "Invalid phone number format. Must be 10 digits.",
		};
	}

	// Helper method to get demo data for specific phone numbers
	getDemoUserScenario(phoneNumber) {
		const scenarios = {
			1111111111: "No assets connected. Only saving account balance present",
			2222222222:
				"All assets connected (Banks account, EPF, Indian stocks, US stocks, Credit report). Large mutual fund portfolio with 9 funds",
			3333333333:
				"All assets connected (Banks account, EPF, Indian stocks, US stocks, Credit report). Small mutual fund portfolio with only 1 fund",
			4444444444:
				"All assets connected except credit score. Multiple bank accounts and EPF UANs",
			5555555555:
				"All assets connected except credit score. Small mutual fund portfolio",
			6666666666:
				"All assets connected except bank account. Large mutual fund portfolio",
			7777777777: "Debt-Heavy Low Performer. Poor MF returns, high liabilities",
			8888888888: "SIP Samurai. Consistent monthly SIP investments",
			9999999999:
				"Fixed Income Fanatic. Strong preference for low-risk investments",
			1010101010:
				"Precious Metal Believer. High allocation to gold and fixed deposits",
			1212121212:
				"Dormant EPF Earner. EPF account but employer stopped contributing",
			1414141414:
				"Salary Sinkhole. Salary consumed by EMIs and credit card bills",
			1313131313: "Balanced Growth Tracker. Well-diversified portfolio",
			2020202020: "Starter Saver. Recently started investing, low ticket sizes",
			2121212121: "Dual Income Dynamo. Freelance + salary income",
			2525252525: "Live-for-Today. High income but spends it all",
		};

		return {
			phoneNumber,
			scenario: scenarios[phoneNumber] || "Unknown scenario",
			isTestAccount: scenarios.hasOwnProperty(phoneNumber),
		};
	}
}
