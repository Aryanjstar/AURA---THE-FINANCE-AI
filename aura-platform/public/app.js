// AURA Financial Platform - Frontend JavaScript

class AURAApp {
	constructor() {
		this.socket = null;
		this.currentSessionId = null;
		this.initializeApp();
	}

	initializeApp() {
		console.log("🚀 AURA Platform initializing...");
		this.initializeSocketConnection();
		this.attachEventListeners();
		this.checkSystemStatus();
	}

	initializeSocketConnection() {
		try {
			if (typeof io !== "undefined") {
				this.socket = io();

				this.socket.on("connect", () => {
					console.log("✅ Socket connected:", this.socket.id);
					this.updateConnectionStatus(true);
					this.socket.emit("join-room", this.socket.id);
				});

				this.socket.on("disconnect", () => {
					console.log("❌ Socket disconnected");
					this.updateConnectionStatus(false);
				});

				// Chat progress updates
				this.socket.on("chat-progress", (data) => {
					console.log("📊 Progress:", data.message);
					this.updateThinkingIndicator(data);
				});

				// Portfolio analysis events
				this.socket.on("analysis-progress", (progress) => {
					this.updateAnalysisProgress(progress);
				});

				this.socket.on("analysis-complete", (results) => {
					this.showAnalysisResults(results);
				});

				this.socket.on("analysis-error", (error) => {
					this.showAnalysisError(error);
				});
			}
		} catch (error) {
			console.error("Socket initialization failed:", error);
		}
	}

	attachEventListeners() {
		// Login button
		const navLoginButton = document.getElementById("navLoginButton");
		if (navLoginButton) {
			navLoginButton.addEventListener("click", () => this.handleLogin());
		}

		// Hero chat button
		const heroChatButton = document.getElementById("heroChatButton");
		if (heroChatButton) {
			heroChatButton.addEventListener("click", () => this.openChatbot());
		}

		// Mobile menu toggle
		const mobileToggle = document.getElementById("mobileMenuToggle");
		if (mobileToggle) {
			mobileToggle.addEventListener("click", () => this.toggleMobileMenu());
		}

		// Modal close buttons
		document.querySelectorAll(".modal-close").forEach((button) => {
			button.addEventListener("click", () => this.closeModal());
		});

		// Send message button
		const sendButton = document.getElementById("sendButton");
		if (sendButton) {
			sendButton.addEventListener("click", () => this.sendMessage());
		}

		// Demo account buttons
		document.querySelectorAll(".demo-account").forEach((button) => {
			button.addEventListener("click", (e) => {
				const phoneNumber = e.target.getAttribute("data-phone");
				this.fillDemoAccount(phoneNumber);
			});
		});

		// Portfolio analysis button
		const startAnalysisButton = document.getElementById("startAnalysisButton");
		if (startAnalysisButton) {
			startAnalysisButton.addEventListener("click", () => this.startPortfolioAnalysis());
		}

		// Cancel analysis button
		const cancelAnalysisButton = document.getElementById("cancelAnalysisButton");
		if (cancelAnalysisButton) {
			cancelAnalysisButton.addEventListener("click", () => this.closeModal());
		}

		// Nav links smooth scroll
		document.querySelectorAll(".nav-link").forEach((link) => {
			link.addEventListener("click", (e) => {
				const href = link.getAttribute("href");
				if (href.startsWith("#")) {
					e.preventDefault();
					const target = document.querySelector(href);
					if (target) {
						target.scrollIntoView({ behavior: "smooth" });
					}
				}
			});
		});

		// Close modal on outside click
		document.addEventListener("click", (e) => {
			if (e.target.classList.contains("modal")) {
				this.closeModal();
			}
		});

		// Phone validation
		const phoneInput = document.getElementById("phoneNumber");
		if (phoneInput) {
			phoneInput.addEventListener("input", this.validatePhoneNumber);
		}
	}

	handleLogin() {
		if (typeof firebaseLogin === "function") {
			firebaseLogin();
		} else if (typeof window.firebaseLogin === "function") {
			window.firebaseLogin();
		} else {
			alert("Login not available.");
		}
	}

	async checkSystemStatus() {
		try {
			const response = await fetch("/api/health");
			const status = await response.json();
			console.log("System Status:", status);
			this.updateSystemStatus(status);
		} catch (error) {
			console.error("Health check failed:", error);
			this.updateSystemStatus({ status: "error" });
		}
	}

	updateSystemStatus(status) {
		const statusIndicator = document.querySelector(".footer-status .status-indicator");
		const statusText = document.querySelector(".footer-status span:last-child");

		if (statusIndicator && statusText) {
			if (status.status === "healthy") {
				statusIndicator.className = "status-indicator online";
				statusText.textContent = "All systems operational";
			} else {
				statusIndicator.className = "status-indicator";
				statusIndicator.style.background = "#ef4444";
				statusText.textContent = "System maintenance";
			}
		}
	}

	updateConnectionStatus(connected) {
		const statusElements = document.querySelectorAll(".connection-status");
		statusElements.forEach((element) => {
			element.textContent = connected ? "Connected" : "Disconnected";
			element.className = `connection-status ${connected ? "connected" : "disconnected"}`;
		});
	}

	toggleMobileMenu() {
		const navMenu = document.querySelector(".nav-menu");
		const toggle = document.querySelector(".mobile-menu-toggle");
		navMenu?.classList.toggle("active");
		toggle?.classList.toggle("active");
	}

	validatePhoneNumber(e) {
		const input = e.target;
		const value = input.value.replace(/\D/g, "");
		input.value = value;

		if (value.length === 10) {
			input.style.borderColor = "var(--success-500)";
		} else if (value.length > 0) {
			input.style.borderColor = "var(--error-500)";
		} else {
			input.style.borderColor = "var(--gray-200)";
		}
	}

	showModal(modalId) {
		const modal = document.getElementById(modalId);
		if (modal) {
			modal.classList.add("active");
			document.body.style.overflow = "hidden";
		}
	}

	closeModal() {
		const activeModal = document.querySelector(".modal.active");
		if (activeModal) {
			activeModal.classList.remove("active");
			document.body.style.overflow = "";
		}
	}

	fillDemoAccount(phoneNumber) {
		const phoneInput = document.getElementById("phoneNumber");
		if (phoneInput) {
			phoneInput.value = phoneNumber;
			phoneInput.dispatchEvent(new Event("input"));
		}
	}

	// ==================== CHAT FUNCTIONALITY ====================

	openChatbot() {
		this.showModal("chatbotModal");
		this.initializeChatbot();
	}

	initializeChatbot() {
		const chatInput = document.getElementById("chatInput");
		if (chatInput) {
			chatInput.addEventListener("keypress", (e) => {
				if (e.key === "Enter") {
					this.sendMessage();
				}
			});
		}
	}

	async sendMessage() {
		const chatInput = document.getElementById("chatInput");
		const sendButton = document.getElementById("sendButton");
		const message = chatInput.value.trim();

		if (!message) return;

		// Disable input
		chatInput.disabled = true;
		sendButton.disabled = true;

		// Add user message
		this.addMessageToChat(message, "user");
		chatInput.value = "";

		// Show "Agents thinking" indicator
		this.showAgentsThinking();

		try {
			const headers = { "Content-Type": "application/json" };

			// Add auth if available
			if (typeof isUserAuthenticated === "function" && isUserAuthenticated()) {
				try {
					const idToken = await firebase.auth().currentUser.getIdToken();
					headers["Authorization"] = `Bearer ${idToken}`;
				} catch (e) {
					console.log("Auth token not available");
				}
			}

			const response = await fetch("/api/chat", {
				method: "POST",
				headers: headers,
				body: JSON.stringify({
					message: message,
					sessionId: this.currentSessionId || this.generateSessionId(),
					socketId: this.socket?.id
				}),
			});

			const data = await response.json();

			// Hide thinking indicator
			this.hideAgentsThinking();

			if (data.success) {
				// Add the response to chat
				this.addMessageToChat(data.response, "assistant", {
					agentsUsed: data.agentsUsed,
					executionTime: data.executionTime
				});

				this.currentSessionId = data.sessionId;
			} else {
				this.addMessageToChat(
					data.response || data.error || "I apologize, but I encountered an error. Please try again.",
					"assistant"
				);
			}
		} catch (error) {
			console.error("Chat error:", error);
			this.hideAgentsThinking();
			this.addMessageToChat(
				"I'm experiencing technical difficulties. Please try again in a moment.",
				"assistant"
			);
		}

		// Re-enable input
		chatInput.disabled = false;
		sendButton.disabled = false;
		chatInput.focus();
	}

	/**
	 * Show animated "Agents thinking" indicator
	 */
	showAgentsThinking() {
		const chatMessages = document.getElementById("chatMessages");
		
		// Remove any existing thinking indicator
		this.hideAgentsThinking();
		
		const thinkingDiv = document.createElement("div");
		thinkingDiv.id = "agentsThinking";
		thinkingDiv.className = "agents-thinking";
		thinkingDiv.innerHTML = `
			<div class="thinking-container">
				<div class="thinking-header">
					<div class="thinking-pulse"></div>
					<span class="thinking-text">AI Agents are analyzing...</span>
				</div>
				<div class="agent-pills">
					<span class="agent-pill active" data-agent="realist">
						<span class="agent-icon">📈</span>
						<span class="agent-name">Realist</span>
					</span>
					<span class="agent-pill" data-agent="quant">
						<span class="agent-icon">🔢</span>
						<span class="agent-name">Quant</span>
					</span>
					<span class="agent-pill" data-agent="strategist">
						<span class="agent-icon">🎯</span>
						<span class="agent-name">Strategist</span>
					</span>
					<span class="agent-pill" data-agent="doer">
						<span class="agent-icon">⚡</span>
						<span class="agent-name">Doer</span>
					</span>
					<span class="agent-pill" data-agent="communicator">
						<span class="agent-icon">💬</span>
						<span class="agent-name">Communicator</span>
					</span>
				</div>
				<div class="thinking-progress">
					<div class="progress-bar"></div>
				</div>
			</div>
		`;
		
		chatMessages.appendChild(thinkingDiv);
		thinkingDiv.scrollIntoView({ behavior: "smooth", block: "center" });

		// Start animation cycle
		this.startAgentAnimation();
	}

	/**
	 * Animate agent pills sequentially
	 */
	startAgentAnimation() {
		const pills = document.querySelectorAll('#agentsThinking .agent-pill');
		let currentIndex = 0;

		this.agentAnimationInterval = setInterval(() => {
			// Remove active from all
			pills.forEach(p => p.classList.remove('active'));
			
			// Add active to current
			if (pills[currentIndex]) {
				pills[currentIndex].classList.add('active');
			}
			
			currentIndex = (currentIndex + 1) % pills.length;
		}, 600);
	}

	/**
	 * Update thinking indicator based on progress
	 */
	updateThinkingIndicator(data) {
		const thinkingText = document.querySelector('#agentsThinking .thinking-text');
		const progressBar = document.querySelector('#agentsThinking .progress-bar');
		
		if (thinkingText && data.message) {
			thinkingText.textContent = data.message;
		}
		
		if (progressBar && data.progress) {
			progressBar.style.width = `${data.progress}%`;
		}

		// Highlight current agent
		if (data.currentAgent) {
			const pills = document.querySelectorAll('#agentsThinking .agent-pill');
			pills.forEach(p => {
				p.classList.remove('active');
				if (p.dataset.agent === data.currentAgent) {
					p.classList.add('active');
				}
			});
		}
	}

	/**
	 * Hide "Agents thinking" indicator
	 */
	hideAgentsThinking() {
		if (this.agentAnimationInterval) {
			clearInterval(this.agentAnimationInterval);
			this.agentAnimationInterval = null;
		}
		
		const thinkingDiv = document.getElementById("agentsThinking");
		if (thinkingDiv) {
			thinkingDiv.remove();
		}
	}

	/**
	 * Add message to chat
	 */
	addMessageToChat(message, sender, options = {}) {
		const chatMessages = document.getElementById("chatMessages");
		const messageDiv = document.createElement("div");
		messageDiv.className = `chat-message ${sender}`;

		const avatar = sender === "user" ? "👤" : "🤖";
		
		// Build agent badge if available
		let agentBadge = '';
		if (sender === "assistant" && options.agentsUsed && options.agentsUsed.length > 0) {
			const primaryAgent = options.agentsUsed[options.agentsUsed.length - 1];
			const agentIcons = {
				'Realist': '📈',
				'Quant': '🔢', 
				'Strategist': '🎯',
				'Doer': '⚡',
				'Communicator': '💬'
			};
			agentBadge = `
				<div class="agent-badge">
					${agentIcons[primaryAgent] || '🤖'} ${primaryAgent}
				</div>
			`;
		}
		
		messageDiv.innerHTML = `
			<div class="message-avatar">${avatar}</div>
			<div class="message-content">
				<div class="message-text">${this.formatMessage(message)}</div>
				${agentBadge}
			</div>
		`;

		chatMessages.appendChild(messageDiv);

		// Scroll behavior
		setTimeout(() => {
			if (sender === "user") {
				chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: "smooth" });
			} else {
				messageDiv.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}, 100);
	}

	/**
	 * Format message with markdown-like syntax
	 */
	formatMessage(message) {
		if (!message) return '';
		
		return message
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			.replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
			.replace(/`(.*?)`/g, "<code>$1</code>")
			.replace(/\n/g, "<br>");
	}

	generateSessionId() {
		return "chat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
	}

	// ==================== PORTFOLIO ANALYSIS ====================

	async startPortfolioAnalysis() {
		const phoneNumber = document.getElementById("phoneNumber")?.value;
		const goals = document.getElementById("userGoals")?.value;
		const riskProfile = document.getElementById("riskProfile")?.value;

		if (!phoneNumber || phoneNumber.length !== 10) {
			this.showError("Please enter a valid 10-digit phone number");
			return;
		}

		this.closeModal();
		this.showModal("progressModal");

		try {
			this.updateAnalysisProgress({ stage: "Initializing AI agents", progress: 0 });

			if (this.socket) {
				this.socket.emit("request-analysis", {
					userId: this.generateUserId(),
					phoneNumber,
					goals,
					riskProfile,
				});
			} else {
				await this.performAnalysisViaREST(phoneNumber, goals, riskProfile);
			}
		} catch (error) {
			console.error("Analysis failed:", error);
			this.showAnalysisError({ error: error.message });
		}
	}

	async performAnalysisViaREST(phoneNumber, goals, riskProfile) {
		try {
			const headers = { "Content-Type": "application/json" };

			if (typeof isUserAuthenticated === "function" && isUserAuthenticated()) {
				const idToken = await firebase.auth().currentUser.getIdToken();
				headers["Authorization"] = `Bearer ${idToken}`;
			}

			const response = await fetch("/api/analyze-portfolio", {
				method: "POST",
				headers: headers,
				body: JSON.stringify({
					userId: this.generateUserId(),
					goals,
					riskProfile,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Analysis failed: ${response.statusText}`);
			}

			const results = await response.json();
			this.showAnalysisResults(results);
		} catch (error) {
			throw error;
		}
	}

	updateAnalysisProgress(progress) {
		const progressFill = document.getElementById("progressFill");
		const progressText = document.getElementById("progressText");
		const progressPercentage = document.getElementById("progressPercentage");

		if (progressFill) progressFill.style.width = `${progress.progress}%`;
		if (progressText) progressText.textContent = progress.stage;
		if (progressPercentage) progressPercentage.textContent = `${progress.progress}%`;

		this.updateAgentStatus(progress);
	}

	updateAgentStatus(progress) {
		const agentMap = {
			"Fetching financial data": "realist",
			"Performing quantitative analysis": "quant",
			"Creating financial strategy": "strategist",
			"Creating action plan": "doer",
			"Preparing communication": "communicator",
		};

		const currentAgent = agentMap[progress.stage];

		if (currentAgent) {
			document.querySelectorAll(".agent-status-item").forEach((item) => {
				const indicator = item.querySelector(".status-indicator");
				indicator.className = "status-indicator waiting";
				indicator.textContent = "⏳";
			});

			const currentElement = document.getElementById(`${currentAgent}-status`);
			if (currentElement) {
				const indicator = currentElement.querySelector(".status-indicator");
				indicator.className = "status-indicator working";
				indicator.textContent = "🔄";
			}

			const completedAgents = this.getCompletedAgents(progress.progress);
			completedAgents.forEach((agent) => {
				const element = document.getElementById(`${agent}-status`);
				if (element) {
					const indicator = element.querySelector(".status-indicator");
					indicator.className = "status-indicator complete";
					indicator.textContent = "✅";
				}
			});
		}
	}

	getCompletedAgents(progress) {
		const completed = [];
		if (progress > 20) completed.push("realist");
		if (progress > 40) completed.push("quant");
		if (progress > 60) completed.push("strategist");
		if (progress > 85) completed.push("doer");
		if (progress >= 100) completed.push("communicator");
		return completed;
	}

	showAnalysisResults(results) {
		console.log("Analysis Results:", results);
		this.closeModal();
		this.populateResultsModal(results);
		this.showModal("resultsModal");
	}

	populateResultsModal(results) {
		const resultsContainer = document.getElementById("analysisResults");
		if (!resultsContainer) return;

		const summary = results.summary || {};

		resultsContainer.innerHTML = `
			<div class="results-summary">
				<div class="summary-header">
					<h4>Analysis Complete</h4>
					<div class="health-score good">✓ Ready</div>
				</div>
			</div>
			<div class="results-content">
				<h5>Key Insights</h5>
				<ul>
					${(summary.keyInsights || ['Portfolio analyzed successfully']).map(i => `<li>${i}</li>`).join('')}
				</ul>
			</div>
		`;
	}

	showAnalysisError(error) {
		console.error("Analysis Error:", error);
		this.closeModal();
		this.showError(`Analysis failed: ${error.error || "Unknown error occurred"}`);
	}

	showError(message) {
		const errorDiv = document.createElement("div");
		errorDiv.className = "error-notification";
		errorDiv.innerHTML = `
			<div class="error-content">
				<span class="error-icon">⚠️</span>
				<span class="error-message">${message}</span>
				<button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
			</div>
		`;

		errorDiv.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: var(--error-500);
			color: white;
			padding: var(--space-4);
			border-radius: var(--radius-md);
			box-shadow: var(--shadow-lg);
			z-index: 3000;
			max-width: 400px;
		`;

		document.body.appendChild(errorDiv);

		setTimeout(() => {
			if (errorDiv.parentElement) {
				errorDiv.remove();
			}
		}, 5000);
	}

	generateUserId() {
		return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
	}

	formatNumber(num) {
		if (num >= 10000000) return (num / 10000000).toFixed(1) + "Cr";
		if (num >= 100000) return (num / 100000).toFixed(1) + "L";
		if (num >= 1000) return (num / 1000).toFixed(1) + "K";
		return num.toString();
	}
}

// Initialize app
let app;
document.addEventListener("DOMContentLoaded", () => {
	app = new AURAApp();
});

// Dynamic styles for the chat interface
const dynamicStyles = `
	/* Agents Thinking Indicator */
	.agents-thinking {
		padding: 16px;
		margin: 8px 0;
	}

	.thinking-container {
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		border: 1px solid #334155;
		border-radius: 16px;
		padding: 20px;
		animation: thinking-glow 2s ease-in-out infinite;
	}

	@keyframes thinking-glow {
		0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); }
		50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.2); }
	}

	.thinking-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.thinking-pulse {
		width: 12px;
		height: 12px;
		background: #3b82f6;
		border-radius: 50%;
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.2); opacity: 0.7; }
	}

	.thinking-text {
		color: #e2e8f0;
		font-size: 14px;
		font-weight: 500;
	}

	.agent-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 16px;
	}

	.agent-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: #1e293b;
		border: 1px solid #334155;
		border-radius: 20px;
		font-size: 12px;
		color: #94a3b8;
		transition: all 0.3s ease;
		opacity: 0.5;
	}

	.agent-pill.active {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		border-color: #60a5fa;
		color: white;
		opacity: 1;
		transform: scale(1.05);
		box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
	}

	.agent-icon {
		font-size: 14px;
	}

	.agent-name {
		font-weight: 500;
	}

	.thinking-progress {
		height: 4px;
		background: #334155;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		width: 0%;
		background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
		background-size: 200% 100%;
		border-radius: 4px;
		animation: progress-shimmer 2s linear infinite;
		transition: width 0.5s ease;
	}

	@keyframes progress-shimmer {
		0% { background-position: -200% 0; }
		100% { background-position: 200% 0; }
	}

	/* Chat Message Styles */
	.chat-message {
		display: flex;
		gap: 12px;
		padding: 12px 16px;
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.chat-message.user {
		flex-direction: row-reverse;
	}

	.chat-message.user .message-content {
		background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
		color: white;
		border-radius: 18px 18px 4px 18px;
	}

	.chat-message.assistant .message-content {
		background: #1e293b;
		color: #e2e8f0;
		border-radius: 18px 18px 18px 4px;
		border: 1px solid #334155;
	}

	.message-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: #334155;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		flex-shrink: 0;
	}

	.message-content {
		max-width: 80%;
		padding: 12px 16px;
	}

	.message-text {
		line-height: 1.6;
		font-size: 14px;
	}

	.message-text strong {
		color: #f1f5f9;
		font-weight: 600;
	}

	.message-text code {
		background: #0f172a;
		padding: 2px 6px;
		border-radius: 4px;
		font-family: monospace;
		font-size: 13px;
	}

	.message-text pre {
		background: #0f172a;
		padding: 12px;
		border-radius: 8px;
		overflow-x: auto;
		margin: 8px 0;
	}

	/* Agent Badge */
	.agent-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-top: 8px;
		padding: 4px 10px;
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 12px;
		font-size: 11px;
		color: #60a5fa;
		font-weight: 500;
	}

	/* Error notification */
	.error-notification .error-content {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	
	.error-close {
		background: none;
		border: none;
		color: white;
		font-size: var(--font-size-lg);
		cursor: pointer;
		padding: 0;
		margin-left: auto;
	}

	/* Responsive */
	@media (max-width: 640px) {
		.message-content {
			max-width: 90%;
		}
		
		.agent-pills {
			gap: 6px;
		}
		
		.agent-pill {
			padding: 4px 8px;
			font-size: 11px;
		}
	}
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);
