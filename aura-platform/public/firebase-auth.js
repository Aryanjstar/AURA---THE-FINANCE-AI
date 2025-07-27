// AURA Simple Login System
console.log("🔐 Loading AURA Simple Login...");

// Demo users with real phone numbers from Fi MCP
const DEMO_USERS = [
	{
		phone: "2222222222",
		name: "Rajesh Kumar",
		email: "rajesh@example.com",
		type: "Complete Portfolio",
	},
	{
		phone: "7777777777",
		name: "Priya Sharma",
		email: "priya@example.com",
		type: "Debt-Heavy Portfolio",
	},
	{
		phone: "8888888888",
		name: "Amit Singh",
		email: "amit@example.com",
		type: "SIP Investor",
	},
	{
		phone: "5555555555",
		name: "Sneha Patel",
		email: "sneha@example.com",
		type: "Balanced Portfolio",
	},
];

// Simple login function
async function doLogin() {
	console.log("🔐 Login clicked!");

	// Show popup notification
	showPopup(
		"Demo User Logged In!",
		"You are now logged in as a demo user. Redirecting to your portfolio dashboard..."
	);

	// Randomly select a demo user
	const randomUser = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
	console.log("👤 Selected demo user:", randomUser);

	// Store user in localStorage
	localStorage.setItem("aura_user", JSON.stringify(randomUser));

	// Redirect to dashboard after 2 seconds
	setTimeout(() => {
		window.location.href = "/dashboard.html";
	}, 2000);
}

// Show popup notification
function showPopup(title, message) {
	// Remove existing popup
	const existing = document.querySelector(".login-popup");
	if (existing) existing.remove();

	const popup = document.createElement("div");
	popup.className = "login-popup";
	popup.style.cssText = `
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 30px;
		border-radius: 16px;
		box-shadow: 0 20px 40px rgba(0,0,0,0.15);
		z-index: 9999;
		text-align: center;
		max-width: 400px;
		animation: popupIn 0.3s ease-out;
	`;

	popup.innerHTML = `
		<div style="color: #10b981; font-size: 48px; margin-bottom: 16px;">✅</div>
		<h3 style="color: #1f2937; margin-bottom: 12px; font-size: 24px;">${title}</h3>
		<p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">${message}</p>
		<div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #3b82f6;">
			<div class="spinner" style="width: 20px; height: 20px; border: 2px solid #e5e7eb; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
			<span>Loading your portfolio...</span>
		</div>
	`;

	// Add backdrop
	const backdrop = document.createElement("div");
	backdrop.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.5);
		z-index: 9998;
	`;

	document.body.appendChild(backdrop);
	document.body.appendChild(popup);

	// Add required CSS
	if (!document.querySelector("#popup-styles")) {
		const style = document.createElement("style");
		style.id = "popup-styles";
		style.textContent = `
			@keyframes popupIn {
				from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
				to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
			}
			@keyframes spin {
				from { transform: rotate(0deg); }
				to { transform: rotate(360deg); }
			}
		`;
		document.head.appendChild(style);
	}
}

// Setup login button
function setupLoginButton() {
	const loginBtn = document.getElementById("navLoginButton");
	if (loginBtn) {
		loginBtn.innerHTML = "Login";
		loginBtn.onclick = doLogin;
		loginBtn.disabled = false;
	}
}

// Make globally available
window.doLogin = doLogin;
window.firebaseLogin = doLogin;

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
	console.log("📄 Setting up simple login...");
	setupLoginButton();
});

console.log("✅ AURA Simple Login loaded!");
