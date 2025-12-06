/**
 * AURA Authentication Module
 * 
 * Handles user authentication with support for:
 * - Demo accounts for testing
 * - Google OAuth (simulated for demo)
 * - Email/Password authentication
 * - Phone OTP authentication
 * 
 * In production, integrate with Firebase, Auth0, or your preferred auth provider.
 */

console.log("🔐 Loading AURA Authentication Module...");

// Demo users with realistic financial profiles for Fi MCP
const DEMO_USERS = {
    "2222222222": {
        uid: "demo_growth_001",
        displayName: "Priya Sharma",
        email: "priya.sharma@email.com",
        phoneNumber: "2222222222",
        profileType: "Growth",
        provider: "demo",
        netWorthRange: "₹25L - ₹50L",
        riskProfile: "Moderate-Aggressive",
        investmentStyle: "SIP Heavy, Equity Focused"
    },
    "8888888888": {
        uid: "demo_conservative_001",
        displayName: "Rajesh Kumar",
        email: "rajesh.kumar@email.com",
        phoneNumber: "8888888888",
        profileType: "Conservative",
        provider: "demo",
        netWorthRange: "₹50L - ₹1Cr",
        riskProfile: "Conservative",
        investmentStyle: "FD Heavy, Debt Focused"
    },
    "4444444444": {
        uid: "demo_aggressive_001",
        displayName: "Vikram Singh",
        email: "vikram.singh@email.com",
        phoneNumber: "4444444444",
        profileType: "Aggressive",
        provider: "demo",
        netWorthRange: "₹1Cr - ₹3Cr",
        riskProfile: "Aggressive",
        investmentStyle: "Direct Equity, Small/Mid Caps"
    },
    "7777777777": {
        uid: "demo_balanced_001",
        displayName: "Ananya Patel",
        email: "ananya.patel@email.com",
        phoneNumber: "7777777777",
        profileType: "Balanced",
        provider: "demo",
        netWorthRange: "₹15L - ₹30L",
        riskProfile: "Moderate",
        investmentStyle: "Balanced Fund, Index Investor"
    }
};

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('aura_user');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (e) {
        console.error('Error getting current user:', e);
    }
    return null;
}

/**
 * Check if user is authenticated
 */
function isUserAuthenticated() {
    const user = getCurrentUser();
    return !!(user && user.uid);
}

/**
 * Get user's authentication token
 */
function getAuthToken() {
    const user = getCurrentUser();
    return user?.token || null;
}

/**
 * Login with demo account
 */
function loginWithDemo(phoneNumber) {
    const demoUser = DEMO_USERS[phoneNumber] || {
        uid: 'demo_' + Date.now(),
        displayName: 'Demo User',
        phoneNumber: phoneNumber,
        profileType: 'Standard',
        provider: 'demo',
        netWorthRange: '₹10L - ₹25L',
        riskProfile: 'Moderate'
    };
    
    const userData = {
        ...demoUser,
        authTime: new Date().toISOString(),
        isDemo: true,
        token: generateToken(demoUser)
    };
    
    localStorage.setItem('aura_user', JSON.stringify(userData));
    console.log('✅ Demo login successful:', demoUser.displayName);
    
    return userData;
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('aura_user');
    console.log('👋 User logged out');
    window.location.reload();
}

/**
 * Generate a simple token (in production, use proper JWT)
 */
function generateToken(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        uid: user.uid,
        email: user.email,
        phone: user.phoneNumber,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
    }));
    const signature = btoa('aura_' + Date.now() + '_' + Math.random().toString(36).slice(2));
    return `${header}.${payload}.${signature}`;
}

/**
 * Validate token (basic validation)
 */
function validateToken(token) {
    if (!token) return false;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        const payload = JSON.parse(atob(parts[1]));
        return payload.exp > Math.floor(Date.now() / 1000);
    } catch (e) {
        return false;
    }
}

/**
 * Setup auth state listener
 */
function onAuthStateChange(callback) {
    // Check initial state
    const user = getCurrentUser();
    callback(user);
    
    // Listen for storage changes (for multi-tab sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'aura_user') {
            const user = e.newValue ? JSON.parse(e.newValue) : null;
            callback(user);
        }
    });
}

// Expose functions globally
window.getCurrentUser = getCurrentUser;
window.isUserAuthenticated = isUserAuthenticated;
window.getAuthToken = getAuthToken;
window.loginWithDemo = loginWithDemo;
window.logout = logout;
window.validateToken = validateToken;
window.onAuthStateChange = onAuthStateChange;
window.DEMO_USERS = DEMO_USERS;

// Legacy compatibility
window.firebaseLogin = function() {
    console.log('Using demo login');
    return loginWithDemo('2222222222');
};
window.doLogin = window.firebaseLogin;

console.log("✅ AURA Authentication Module loaded!");
console.log("📱 Available demo accounts:", Object.keys(DEMO_USERS));
