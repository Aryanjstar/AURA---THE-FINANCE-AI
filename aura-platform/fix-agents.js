import fs from "fs";

const agentFiles = [
	"/Users/golu/Desktop/AURA/aura-platform/agents/communicator.js",
	"/Users/golu/Desktop/AURA/aura-platform/agents/quant.js",
	"/Users/golu/Desktop/AURA/aura-platform/agents/doer.js",
];

agentFiles.forEach((filePath) => {
	console.log(`Processing ${filePath}...`);

	let content = fs.readFileSync(filePath, "utf8");

	// Replace the model usage pattern
	content = content.replace(
		/const result = await this\.model\.generateContent\(/g,
		"const model = this._initializeModel();\n\t\t\tconst result = await model.generateContent("
	);

	// Update other variations
	content = content.replace(
		/await this\.model\.generateContent\(/g,
		"await this._initializeModel().generateContent("
	);

	fs.writeFileSync(filePath, content);
	console.log(`Updated ${filePath}`);
});

console.log("All agent files updated!");
