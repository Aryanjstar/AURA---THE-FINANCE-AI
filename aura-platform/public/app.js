// AURA Financial Platform - Frontend JavaScript

class AURAApp {
	// Called when Login button is clicked
	handleLogin() {
		if (typeof firebaseLogin === "function") {
			firebaseLogin();
		} else if (typeof window.firebaseLogin === "function") {
			window.firebaseLogin();
		} else {
			alert("Login not available.");
		}
	}
	constructor() {
		this.socket = null;
		this.analysisInProgress = false;
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
			// Initialize Socket.IO connection
			if (typeof io !== "undefined") {
				this.socket = io();

				this.socket.on("connect", () => {
					console.log("✅ Socket connected:", this.socket.id);
					this.updateConnectionStatus(true);
				});

				this.socket.on("disconnect", () => {
					console.log("❌ Socket disconnected");
					this.updateConnectionStatus(false);
				});

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
		// Navbar Login button (Firebase OAuth)
		const navLoginButton = document.getElementById("navLoginButton");
		const heroChatButton = document.getElementById("heroChatButton");

		if (navLoginButton) {
			navLoginButton.addEventListener("click", () => {
				console.log("Login button clicked");
				this.handleLogin(); // Placeholder for Firebase OAuth
			});
		}

		if (heroChatButton) {
			heroChatButton.addEventListener("click", () => {
				console.log("Hero chat button clicked");
				this.openChatbot();
			});
		}

		// Mobile menu toggle
		const mobileToggle = document.getElementById("mobileMenuToggle");
		if (mobileToggle) {
			mobileToggle.addEventListener("click", () => {
				this.toggleMobileMenu();
			});
		}

		// Modal close buttons
		document.querySelectorAll(".modal-close").forEach((button) => {
			button.addEventListener("click", () => {
				this.closeModal();
			});
		});

		// Send message button
		const sendButton = document.getElementById("sendButton");
		if (sendButton) {
			sendButton.addEventListener("click", () => {
				this.sendMessage();
			});
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
			startAnalysisButton.addEventListener("click", () => {
				this.startPortfolioAnalysis();
			});
		}

		// Cancel button in analysis modal
		const cancelAnalysisButton = document.getElementById(
			"cancelAnalysisButton"
		);
		if (cancelAnalysisButton) {
			cancelAnalysisButton.addEventListener("click", () => {
				this.closeModal();
			});
		}

		// Smooth scrolling for navigation links
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

		// Close modal when clicking outside
		document.addEventListener("click", (e) => {
			if (e.target.classList.contains("modal")) {
				this.closeModal();
			}
		});

		// Form validation
		const phoneInput = document.getElementById("phoneNumber");
		if (phoneInput) {
			phoneInput.addEventListener("input", this.validatePhoneNumber);
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
		const statusIndicator = document.querySelector(
			".footer-status .status-indicator"
		);
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
		// Update UI to reflect connection status
		const statusElements = document.querySelectorAll(".connection-status");
		statusElements.forEach((element) => {
			element.textContent = connected ? "Connected" : "Disconnected";
			element.className = `connection-status ${
				connected ? "connected" : "disconnected"
			}`;
		});
	}

	toggleMobileMenu() {
		const navMenu = document.querySelector(".nav-menu");
		const toggle = document.querySelector(".mobile-menu-toggle");

		navMenu.classList.toggle("active");
		toggle.classList.toggle("active");
	}

	validatePhoneNumber(e) {
		const input = e.target;
		const value = input.value.replace(/\D/g, ""); // Remove non-digits
		input.value = value;

		const formGroup = input.closest(".form-group");
		const existingError = formGroup.querySelector(".error-message");

		if (existingError) {
			existingError.remove();
		}

		if (value.length === 10) {
			input.style.borderColor = "var(--success-500)";
		} else if (value.length > 0) {
			input.style.borderColor = "var(--error-500)";

			if (value.length > 10) {
				const errorMsg = document.createElement("div");
				errorMsg.className = "error-message";
				errorMsg.textContent = "Phone number must be exactly 10 digits";
				errorMsg.style.color = "var(--error-500)";
				errorMsg.style.fontSize = "var(--font-size-sm)";
				errorMsg.style.marginTop = "var(--space-1)";
				formGroup.appendChild(errorMsg);
			}
		} else {
			input.style.borderColor = "var(--gray-200)";
		}
	}

	showModal(modalId) {
		console.log("showModal called with:", modalId);
		const modal = document.getElementById(modalId);
		console.log("Modal element found:", modal);
		if (modal) {
			modal.classList.add("active");
			document.body.style.overflow = "hidden";
			console.log("Modal should now be visible");
		} else {
			console.error("Modal not found:", modalId);
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

	async startPortfolioAnalysis() {
		if (this.analysisInProgress) {
			console.log("Analysis already in progress");
			return;
		}

		const phoneNumber = document.getElementById("phoneNumber")?.value;
		const goals = document.getElementById("userGoals")?.value;
		const riskProfile = document.getElementById("riskProfile")?.value;

		// Validation
		if (!phoneNumber || phoneNumber.length !== 10) {
			this.showError("Please enter a valid 10-digit phone number");
			return;
		}

		this.analysisInProgress = true;
		this.closeModal();
		this.showModal("progressModal");

		try {
			// Initialize progress
			this.updateAnalysisProgress({
				stage: "Initializing AI agents",
				progress: 0,
			});

			if (this.socket) {
				// Use Socket.IO for real-time updates
				this.socket.emit("request-analysis", {
					userId: this.generateUserId(),
					phoneNumber,
					goals,
					riskProfile,
				});
			} else {
				// Fallback to REST API
				await this.performAnalysisViaREST(phoneNumber, goals, riskProfile);
			}
		} catch (error) {
			console.error("Analysis failed:", error);
			this.showAnalysisError({ error: error.message });
		}
	}

	async performAnalysisViaREST(phoneNumber, goals, riskProfile) {
		try {
			// Get auth headers
			const headers = {
				"Content-Type": "application/json",
			};

			// Add auth token if user is authenticated
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
				throw new Error(
					errorData.error || `Analysis failed: ${response.statusText}`
				);
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

		if (progressFill) {
			progressFill.style.width = `${progress.progress}%`;
		}

		if (progressText) {
			progressText.textContent = progress.stage;
		}

		if (progressPercentage) {
			progressPercentage.textContent = `${progress.progress}%`;
		}

		// Update agent status
		this.updateAgentStatus(progress);

		console.log(`Analysis Progress: ${progress.progress}% - ${progress.stage}`);
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
			// Reset all agents to waiting
			document.querySelectorAll(".agent-status-item").forEach((item) => {
				const indicator = item.querySelector(".status-indicator");
				indicator.className = "status-indicator waiting";
				indicator.textContent = "⏳";
			});

			// Set current agent to working
			const currentElement = document.getElementById(`${currentAgent}-status`);
			if (currentElement) {
				const indicator = currentElement.querySelector(".status-indicator");
				indicator.className = "status-indicator working";
				indicator.textContent = "🔄";
			}

			// Mark completed agents
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

		this.analysisInProgress = false;
		this.closeModal();

		// Populate results modal
		this.populateResultsModal(results);
		this.showModal("resultsModal");
	}

	populateResultsModal(results) {
		const resultsContainer = document.getElementById("analysisResults");
		if (!resultsContainer) return;

		const summary = results.summary || {};
		const data = results.data || {};

		resultsContainer.innerHTML = `
			<div class="results-summary">
				<div class="summary-header">
					<h4>Financial Health Score</h4>
					<div class="health-score ${summary.financialHealth?.toLowerCase() || "good"}">
						${summary.financialHealth || "Good"}
					</div>
				</div>
				<div class="confidence-indicator">
					<span>Analysis Confidence: ${Math.round(
						(results.confidence || 0.8) * 100
					)}%</span>
					<div class="confidence-bar">
						<div class="confidence-fill" style="width: ${Math.round(
							(results.confidence || 0.8) * 100
						)}%"></div>
					</div>
				</div>
			</div>

			<div class="results-tabs">
				<button class="tab-button active" onclick="showTab('overview')">Overview</button>
				<button class="tab-button" onclick="showTab('metrics')">Metrics</button>
				<button class="tab-button" onclick="showTab('actions')">Action Plan</button>
				<button class="tab-button" onclick="showTab('insights')">AI Insights</button>
			</div>

			<div class="tab-content">
				<div id="overview-tab" class="tab-panel active">
					${this.generateOverviewTab(summary, data)}
				</div>
				<div id="metrics-tab" class="tab-panel">
					${this.generateMetricsTab(data.quantitativeAnalysis)}
				</div>
				<div id="actions-tab" class="tab-panel">
					${this.generateActionsTab(data.actionPlan)}
				</div>
				<div id="insights-tab" class="tab-panel">
					${this.generateInsightsTab(data.communication)}
				</div>
			</div>
		`;
	}

	generateOverviewTab(summary, data) {
		const insights = summary.keyInsights || [];
		const recommendations = summary.topRecommendations || [];

		return `
			<div class="overview-grid">
				<div class="overview-card">
					<h5>Key Insights</h5>
					<ul class="insights-list">
						${insights.map((insight) => `<li>${insight}</li>`).join("")}
					</ul>
				</div>
				<div class="overview-card">
					<h5>Top Recommendations</h5>
					<ul class="recommendations-list">
						${recommendations.map((rec) => `<li>${rec}</li>`).join("")}
					</ul>
				</div>
				<div class="overview-card">
					<h5>Risk Assessment</h5>
					<div class="risk-indicator ${summary.riskLevel?.toLowerCase() || "medium"}">
						${summary.riskLevel || "Medium"} Risk
					</div>
				</div>
			</div>
		`;
	}

	generateMetricsTab(quantAnalysis) {
		if (!quantAnalysis || !quantAnalysis.metrics) {
			return "<p>Quantitative metrics not available</p>";
		}

		const metrics = quantAnalysis.metrics;

		return `
			<div class="metrics-grid">
				${
					metrics.netWorth
						? `
					<div class="metric-card">
						<h6>Net Worth</h6>
						<div class="metric-value">₹${this.formatNumber(metrics.netWorth)}</div>
					</div>
				`
						: ""
				}
				${
					metrics.xirr
						? `
					<div class="metric-card">
						<h6>XIRR</h6>
						<div class="metric-value">${metrics.xirr.toFixed(2)}%</div>
					</div>
				`
						: ""
				}
				${
					metrics.cagr
						? `
					<div class="metric-card">
						<h6>CAGR</h6>
						<div class="metric-value">${metrics.cagr.toFixed(2)}%</div>
					</div>
				`
						: ""
				}
				${
					metrics.volatility
						? `
					<div class="metric-card">
						<h6>Volatility</h6>
						<div class="metric-value">${metrics.volatility.toFixed(2)}%</div>
					</div>
				`
						: ""
				}
				${
					metrics.sharpeRatio
						? `
					<div class="metric-card">
						<h6>Sharpe Ratio</h6>
						<div class="metric-value">${metrics.sharpeRatio.toFixed(2)}</div>
					</div>
				`
						: ""
				}
			</div>
			${
				metrics.assetAllocation
					? `
				<div class="allocation-section">
					<h6>Asset Allocation</h6>
					<div class="allocation-breakdown">
						${Object.entries(metrics.assetAllocation)
							.map(
								([asset, percentage]) => `
							<div class="allocation-row">
								<span class="asset-name">${asset}</span>
								<span class="asset-percentage">${percentage.toFixed(1)}%</span>
								<div class="allocation-bar">
									<div class="allocation-fill" style="width: ${percentage}%"></div>
								</div>
							</div>
						`
							)
							.join("")}
					</div>
				</div>
			`
					: ""
			}
		`;
	}

	generateActionsTab(actionPlan) {
		if (!actionPlan || !actionPlan.actionPlan) {
			return "<p>Action plan not available</p>";
		}

		const plan = actionPlan.actionPlan;

		return `
			<div class="actions-container">
				${
					plan.immediate && plan.immediate.length > 0
						? `
					<div class="action-section">
						<h6>Immediate Actions (Next 7 days)</h6>
						<div class="action-list">
							${plan.immediate
								.map(
									(action) => `
								<div class="action-item">
									<div class="action-header">
										<span class="action-title">${action.title}</span>
										<span class="action-priority ${action.priority?.toLowerCase() || "medium"}">${
										action.priority || "Medium"
									}</span>
									</div>
									${
										action.steps && action.steps.length > 0
											? `
										<div class="action-steps">
											${action.steps.map((step) => `<div class="action-step">${step}</div>`).join("")}
										</div>
									`
											: ""
									}
								</div>
							`
								)
								.join("")}
						</div>
					</div>
				`
						: ""
				}
				
				${
					plan.shortTerm && plan.shortTerm.length > 0
						? `
					<div class="action-section">
						<h6>Short-term Actions (1-3 months)</h6>
						<div class="action-list">
							${plan.shortTerm
								.map(
									(action) => `
								<div class="action-item">
									<div class="action-header">
										<span class="action-title">${action.title}</span>
										<span class="action-priority ${action.priority?.toLowerCase() || "medium"}">${
										action.priority || "Medium"
									}</span>
									</div>
								</div>
							`
								)
								.join("")}
						</div>
					</div>
				`
						: ""
				}
			</div>
		`;
	}

	generateInsightsTab(communication) {
		if (!communication || !communication.message) {
			return "<p>AI insights not available</p>";
		}

		const message = communication.message;

		return `
			<div class="insights-container">
				${
					message.executiveSummary
						? `
					<div class="insight-section">
						<h6>Executive Summary</h6>
						<p>${message.executiveSummary}</p>
					</div>
				`
						: ""
				}
				
				${
					message.insights && message.insights.length > 0
						? `
					<div class="insight-section">
						<h6>Personalized Insights</h6>
						<ul class="insight-list">
							${message.insights.map((insight) => `<li>${insight}</li>`).join("")}
						</ul>
					</div>
				`
						: ""
				}
				
				${
					message.motivation
						? `
					<div class="insight-section">
						<h6>Motivation & Guidance</h6>
						<p>${message.motivation}</p>
					</div>
				`
						: ""
				}
				
				${
					message.education
						? `
					<div class="insight-section">
						<h6>Educational Insight</h6>
						<p>${message.education}</p>
					</div>
				`
						: ""
				}
			</div>
		`;
	}

	showAnalysisError(error) {
		console.error("Analysis Error:", error);

		this.analysisInProgress = false;
		this.closeModal();

		this.showError(
			`Analysis failed: ${error.error || "Unknown error occurred"}`
		);
	}

	showError(message) {
		// Create error notification
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

		// Auto-remove after 5 seconds
		setTimeout(() => {
			if (errorDiv.parentElement) {
				errorDiv.remove();
			}
		}, 5000);
	}

	showDemo() {
		// Show demo with sample data
		this.fillDemoAccount("2222222222");
		this.showModal("analysisModal");
	}

	formatNumber(num) {
		if (num >= 10000000) {
			return (num / 10000000).toFixed(1) + "Cr";
		} else if (num >= 100000) {
			return (num / 100000).toFixed(1) + "L";
		} else if (num >= 1000) {
			return (num / 1000).toFixed(1) + "K";
		}
		return num.toString();
	}

	generateUserId() {
		return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
	}

	// Chatbot Methods
	openChatbot() {
		console.log("AURAApp.openChatbot called");
		console.log("Calling showModal with chatbotModal");
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

		// Disable input while processing
		chatInput.disabled = true;
		sendButton.disabled = true;

		// Add user message to chat
		this.addMessageToChat(message, "user");
		chatInput.value = "";

		// Show typing indicator
		this.showTypingIndicator();

		try {
			// Get auth headers
			const headers = {
				"Content-Type": "application/json",
			};

			// Add auth token if user is authenticated
			if (typeof isUserAuthenticated === "function" && isUserAuthenticated()) {
				const idToken = await firebase.auth().currentUser.getIdToken();
				headers["Authorization"] = `Bearer ${idToken}`;
			}

			// Send message to backend
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: headers,
				body: JSON.stringify({
					message: message,
					sessionId: this.currentSessionId || this.generateSessionId(),
				}),
			});

			const data = await response.json();

			// Hide typing indicator
			this.hideTypingIndicator();

			if (data.success) {
				// Add AI response to chat
				this.addMessageToChat(data.response, "assistant");

				// Update current session ID
				this.currentSessionId = data.sessionId;

				// Show agent activity if provided
				if (data.agentActivity) {
					this.showAgentActivity(data.agentActivity);
				}
			} else {
				this.addMessageToChat(
					data.error ||
						"I apologize, but I encountered an error. Please try again.",
					"assistant"
				);
			}
		} catch (error) {
			console.error("Chat error:", error);
			this.hideTypingIndicator();
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

	addMessageToChat(message, sender) {
		const chatMessages = document.getElementById("chatMessages");
		const messageDiv = document.createElement("div");
		messageDiv.className = `chat-message ${sender}`;

		const avatar = sender === "user" ? "👤" : "🤖";
		messageDiv.innerHTML = `
			<div class="message-avatar">${avatar}</div>
			<div class="message-content">
				<div class="message-text">${this.formatMessage(message)}</div>
			</div>
		`;

		chatMessages.appendChild(messageDiv);

		// Smart scrolling behavior
		if (sender === "user") {
			// For user messages, smoothly scroll to bottom
			setTimeout(() => {
				chatMessages.scrollTo({
					top: chatMessages.scrollHeight,
					behavior: "smooth"
				});
			}, 50);
		} else if (sender === "assistant") {
			// For AI responses, scroll to the top of the new message for better readability
			setTimeout(() => {
				messageDiv.scrollIntoView({
					behavior: "smooth",
					block: "start",
					inline: "nearest"
				});
			}, 100);
		}
	}

	formatMessage(message) {
		// Convert markdown-style formatting to HTML
		return message
			.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
			.replace(/\*(.*?)\*/g, "<em>$1</em>")
			.replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
			.replace(/`(.*?)`/g, "<code>$1</code>")
			.replace(/\n/g, "<br>");
	}

	showTypingIndicator() {
		const indicator = document.getElementById("typingIndicator");
		if (indicator) {
			indicator.style.display = "flex";
		}
	}

	hideTypingIndicator() {
		const indicator = document.getElementById("typingIndicator");
		if (indicator) {
			indicator.style.display = "none";
		}
	}

	showAgentActivity(activity) {
		// Create agent status display in chat
		const chatMessages = document.getElementById("chatMessages");
		const activityDiv = document.createElement("div");
		activityDiv.className = "agent-activity-display";

		let agentStatus = "";
		activity.forEach((agent) => {
			agentStatus += `<div class="agent-status-mini">
				<span class="agent-icon">${agent.icon}</span>
				<span class="agent-name">${agent.name}</span>
				<span class="agent-status ${agent.status}">${agent.activity}</span>
			</div>`;
		});

		activityDiv.innerHTML = `
			<div class="activity-container">
				<h4>🤖 AI Agents Working</h4>
				<div class="agent-status-grid">
					${agentStatus}
				</div>
			</div>
		`;

		chatMessages.appendChild(activityDiv);
		// Removed automatic scroll to bottom - let the AI response scrolling handle positioning
	}

	generateSessionId() {
		return "chat_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
	}
}

// Tab functionality for results modal
function showTab(tabName) {
	// Hide all tab panels
	document.querySelectorAll(".tab-panel").forEach((panel) => {
		panel.classList.remove("active");
	});

	// Remove active class from all tab buttons
	document.querySelectorAll(".tab-button").forEach((button) => {
		button.classList.remove("active");
	});

	// Show selected tab panel
	const selectedPanel = document.getElementById(`${tabName}-tab`);
	if (selectedPanel) {
		selectedPanel.classList.add("active");
	}

	// Add active class to clicked button
	event.target.classList.add("active");
}

// Initialize the app when DOM is loaded
let app;
document.addEventListener("DOMContentLoaded", () => {
	app = new AURAApp();
});

// Add CSS for dynamic elements
const dynamicStyles = `
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
	
	.results-summary {
		margin-bottom: var(--space-6);
		padding: var(--space-6);
		background: var(--gradient-secondary);
		border-radius: var(--radius-lg);
	}
	
	.summary-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}
	
	.health-score {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: var(--font-size-lg);
	}
	
	.health-score.excellent { background: var(--success-100); color: var(--success-500); }
	.health-score.good { background: var(--primary-100); color: var(--primary-600); }
	.health-score.needs.attention { background: var(--warning-100); color: var(--warning-500); }
	
	.confidence-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	
	.confidence-bar {
		flex: 1;
		height: 6px;
		background: var(--gray-200);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	
	.confidence-fill {
		height: 100%;
		background: var(--gradient-primary);
		border-radius: var(--radius-sm);
		transition: width 0.5s ease-out;
	}
	
	.results-tabs {
		display: flex;
		border-bottom: 1px solid var(--gray-200);
		margin-bottom: var(--space-6);
	}
	
	.tab-button {
		padding: var(--space-3) var(--space-6);
		border: none;
		background: none;
		color: var(--gray-500);
		font-weight: 500;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: var(--transition-fast);
	}
	
	.tab-button.active {
		color: var(--primary-600);
		border-bottom-color: var(--primary-600);
	}
	
	.tab-panel {
		display: none;
	}
	
	.tab-panel.active {
		display: block;
	}
	
	.overview-grid {
		display: grid;
		gap: var(--space-6);
	}
	
	.overview-card {
		padding: var(--space-4);
		background: var(--gray-50);
		border-radius: var(--radius-md);
		border: 1px solid var(--gray-200);
	}
	
	.overview-card h5 {
		font-weight: 600;
		color: var(--gray-900);
		margin-bottom: var(--space-3);
	}
	
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	
	.metric-card {
		padding: var(--space-4);
		background: var(--gray-50);
		border-radius: var(--radius-md);
		text-align: center;
	}
	
	.metric-card h6 {
		font-size: var(--font-size-sm);
		color: var(--gray-500);
		margin-bottom: var(--space-2);
	}
	
	.metric-value {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--primary-600);
	}
	
	.action-section {
		margin-bottom: var(--space-8);
	}
	
	.action-section h6 {
		font-weight: 600;
		color: var(--gray-900);
		margin-bottom: var(--space-4);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--gray-200);
	}
	
	.action-item {
		padding: var(--space-4);
		background: var(--gray-50);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-3);
	}
	
	.action-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}
	
	.action-title {
		font-weight: 500;
		color: var(--gray-900);
	}
	
	.action-priority {
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 500;
	}
	
	.action-priority.high { background: var(--error-100); color: var(--error-500); }
	.action-priority.medium { background: var(--warning-100); color: var(--warning-500); }
	.action-priority.low { background: var(--success-100); color: var(--success-500); }
`;

// Inject dynamic styles
const styleSheet = document.createElement("style");
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);
