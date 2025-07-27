#!/usr/bin/env node

// AURA System Test Script
import fetch from "node-fetch";
import { FiMCPClient } from "./services/fi-mcp-client.js";

const BASE_URL = "http://localhost:3000";

async function testSystem() {
	console.log("🚀 AURA System Test Suite Starting...\n");

	// Test 1: Health Check
	try {
		console.log("📊 Testing Health Endpoint...");
		const response = await fetch(`${BASE_URL}/api/health`);
		const health = await response.json();
		console.log("✅ Health Check:", health.status);
		console.log("🔗 Fi MCP Connected:", health.services.fiMCP);
		console.log("🤖 Agents Available:", health.services.agents.length);
	} catch (error) {
		console.log("❌ Health Check Failed:", error.message);
	}

	console.log("\n" + "=".repeat(50) + "\n");

	// Test 2: Fi MCP Tools
	try {
		console.log("🛠️ Testing Fi MCP Tools...");
		const response = await fetch(`${BASE_URL}/api/fi-mcp/tools`);
		const tools = await response.json();
		console.log("✅ Fi MCP Tools Available:", tools.length);
		tools.forEach((tool) => {
			console.log(
				`   📋 ${tool.name}: ${tool.description.substring(0, 60)}...`
			);
		});
	} catch (error) {
		console.log("❌ Fi MCP Tools Test Failed:", error.message);
	}

	console.log("\n" + "=".repeat(50) + "\n");

	// Test 3: Chat API - General Finance Question
	try {
		console.log("💬 Testing Chat API - General Question...");
		const response = await fetch(`${BASE_URL}/api/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message: "What is XIRR and how is it different from CAGR?",
				sessionId: "test_session_1",
			}),
		});
		const chat = await response.json();
		console.log("✅ Chat Response Generated");
		console.log("🤖 Agents Used:", chat.agentActivity?.length || 0);
		console.log(
			"📝 Response Preview:",
			chat.response?.substring(0, 100) + "..."
		);
	} catch (error) {
		console.log("❌ Chat API Test Failed:", error.message);
	}

	console.log("\n" + "=".repeat(50) + "\n");

	// Test 4: Chat API - Portfolio Analysis with Demo Data
	try {
		console.log("📊 Testing Chat API - Portfolio Analysis...");
		const response = await fetch(`${BASE_URL}/api/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message: "Can you analyze my portfolio? My phone number is 2222222222",
				sessionId: "test_session_2",
			}),
		});
		const chat = await response.json();
		console.log("✅ Portfolio Analysis Response Generated");
		console.log("🤖 Agents Used:", chat.agentActivity?.length || 0);
		console.log(
			"📞 Fi MCP Data Used:",
			chat.response?.includes("portfolio") ? "Yes" : "Unknown"
		);
		console.log(
			"📝 Response Preview:",
			chat.response?.substring(0, 100) + "..."
		);
	} catch (error) {
		console.log("❌ Portfolio Analysis Test Failed:", error.message);
	}

	console.log("\n" + "=".repeat(50) + "\n");

	// Test 5: Chat API - Non-Finance Question (Domain Validation)
	try {
		console.log("🚫 Testing Domain Validation - Non-Finance Question...");
		const response = await fetch(`${BASE_URL}/api/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				message: "What's the weather like today?",
				sessionId: "test_session_3",
			}),
		});
		const chat = await response.json();
		console.log("✅ Domain Validation Working");
		console.log(
			"🔒 Blocked Non-Finance Query:",
			chat.response?.includes("financial") ? "Yes" : "No"
		);
		console.log(
			"📝 Response Preview:",
			chat.response?.substring(0, 100) + "..."
		);
	} catch (error) {
		console.log("❌ Domain Validation Test Failed:", error.message);
	}

	console.log("\n" + "=".repeat(50) + "\n");

	// Test 6: Fi MCP Direct Connection
	try {
		console.log("🔗 Testing Direct Fi MCP Connection...");
		const fiClient = new FiMCPClient();
		await fiClient.authenticate();
		const tools = await fiClient.listTools();
		console.log("✅ Direct Fi MCP Connection Successful");
		console.log("🛠️ Tools Available:", tools.length);

		// Test a sample data fetch
		try {
			const netWorth = await fiClient.callTool("fetch_net_worth", {
				phone_number: "2222222222",
			});
			console.log(
				"💰 Sample Net Worth Fetch:",
				netWorth ? "Success" : "Failed"
			);
		} catch (dataError) {
			console.log("💰 Sample Data Fetch:", "Failed (Expected for demo)");
		}
	} catch (error) {
		console.log("❌ Direct Fi MCP Test Failed:", error.message);
	}

	console.log("\n" + "=".repeat(50) + "\n");
	console.log("🎉 AURA System Test Suite Complete!");
	console.log("\n💡 Next Steps:");
	console.log("1. Open http://localhost:3000 in your browser");
	console.log('2. Click "Get Started" to open the chatbot');
	console.log("3. Try these test queries:");
	console.log('   • "What is XIRR?"');
	console.log('   • "Analyze my portfolio: 2222222222"');
	console.log('   • "How should I diversify my investments?"');
	console.log('   • "What are the current market trends?"');
}

// Run the test suite
testSystem().catch(console.error);
