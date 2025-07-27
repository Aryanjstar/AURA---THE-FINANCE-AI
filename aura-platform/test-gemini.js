import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

console.log("Environment check:");
console.log("API Key exists:", !!process.env.GEMINI_API_KEY);
console.log("API Key length:", process.env.GEMINI_API_KEY?.length);
console.log("API Key prefix:", process.env.GEMINI_API_KEY?.substring(0, 10));

async function testGemini() {
	try {
		console.log("\nInitializing GoogleGenerativeAI...");
		const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

		console.log("Getting model...");
		const model = genAI.getGenerativeModel({
			model: "gemini-2.0-flash",
		});

		console.log("Generating content...");
		const result = await model.generateContent("Hello, just say hi back");
		const response = await result.response;
		const text = response.text();

		console.log("Success! Response:", text);
	} catch (error) {
		console.error("Error details:");
		console.error("Type:", error.constructor.name);
		console.error("Message:", error.message);
		console.error("Status:", error.status);
		console.error("Error code:", error.errorDetails?.[0]?.reason);
		console.error("Full error:", error);
	}
}

testGemini();
