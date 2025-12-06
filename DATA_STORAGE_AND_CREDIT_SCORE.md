# Data Storage & Credit Score Implementation

## 1. Credit Score Calculation

### For Onboarded Users (Real Users)
**Location:** `aura-platform/public/dashboard.html` (lines ~1266-1295)

**Calculation Logic:**
The credit score is now **calculated dynamically** based on the user's financial profile:

```javascript
// Base score: 650 (starting point, similar to CIBIL range 300-900)

// Positive Factors:
- Savings Rate > 30%: +50 points
- Savings Rate > 50%: +30 points  
- Net Worth > ₹10L: +30 points
- Debt-to-Income < 30%: +40 points

// Negative Factors:
- Debt-to-Income > 50%: -50 points
- Debt-to-Income > 70%: -30 points
- Loans > Annual Income: -40 points
- Negative Savings: -60 points

// Final score clamped to 300-900 range
```

**Formula:**
```
Credit Score = 650 + (savings_rate_bonus) + (net_worth_bonus) + (debt_ratio_bonus) - (debt_penalties)
Final Score = max(300, min(900, calculated_score))
```

### For Demo Accounts
**Source:** Fi.Money MCP Server (`fi-mcp-dev`)
- Credit scores come from the MCP server's test data
- Each demo phone number has a pre-configured credit score in the MCP server's JSON files
- **NOT hardcoded** - fetched via `fetch_credit_report` tool call
- Fallback generation (seed-based) only used if MCP server is completely unavailable

---

## 2. Data Storage

### Current Implementation (Development)
**Location:** `aura-platform/server.js`

**User Data Storage:**
- **In-Memory:** `Map()` objects (`registeredUsers`, `userProfiles`)
- **Local Storage (Browser):** `localStorage.getItem('aura_user')` for frontend persistence
- **Session Storage:** `sessionStorage` for temporary demo profile selection

**What's Stored:**
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  passwordHash: string,  // Simple hash (NOT secure for production)
  onboardingData: {
    ageGroup, monthlyIncome, monthlyExpenses,
    primaryGoal, targetAmount, timeHorizon,
    riskTolerance, currentSavings, currentInvestments,
    existingLoans
  },
  hasCompletedOnboarding: boolean,
  createdAt: ISO timestamp,
  lastLoginAt: ISO timestamp
}
```

### Production Deployment
**Recommended Database:** PostgreSQL or MongoDB

**Database Schema (PostgreSQL Example):**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- Use bcrypt
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  onboarding_completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  age_group VARCHAR(50),
  monthly_income INTEGER,
  monthly_expenses INTEGER,
  primary_goal VARCHAR(255),
  target_amount BIGINT,
  time_horizon VARCHAR(50),
  risk_tolerance VARCHAR(50),
  current_savings BIGINT,
  current_investments BIGINT,
  existing_loans BIGINT,
  calculated_credit_score INTEGER,  -- Store calculated score
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Environment Variables for Production:**
```env
DATABASE_URL=postgresql://user:password@host:5432/aura_db
JWT_SECRET=your-secret-key-here
SESSION_SECRET=your-session-secret
```

**Migration Path:**
1. Replace `Map()` with database queries
2. Use proper password hashing (bcrypt)
3. Implement JWT tokens for authentication
4. Add database connection pooling
5. Implement data backup and recovery

---

## 3. Demo Accounts Data Source

### All Data from Fi.Money MCP
**Location:** `aura-platform/services/fi-mcp-client.js`

**Data Flow:**
1. **Primary Source:** Fi.Money MCP Server (`http://localhost:8080` for dev)
2. **Tool Calls:** All data fetched via MCP tool calls:
   - `fetch_net_worth` → Net worth, assets, liabilities
   - `fetch_bank_transactions` → Transaction history
   - `fetch_mf_transactions` → Mutual fund data
   - `fetch_stock_transactions` → Stock portfolio
   - `fetch_credit_report` → Credit score and report
   - `fetch_epf_details` → EPF information

3. **Fallback:** Only used if MCP server is completely down (ECONNREFUSED, ETIMEDOUT, 500+ errors)
   - Fallback data is seed-based (consistent per phone number)
   - **NOT hardcoded values** - generated algorithmically

**Credit Score Source:**
- **Demo Accounts:** From MCP server's `test_data_dir/{phone_number}/fetch_credit_report.json`
- **NOT hardcoded** - each phone number has its own data file in fi-mcp-dev server
- Example: Phone `2222222222` → `fi-mcp-dev/test_data_dir/2222222222/fetch_credit_report.json`

---

## 4. RAG Implementation

**Location:** `aura-platform/services/rag-service.js`

**Knowledge Base:**
- **13 Documents** in `FINANCIAL_KNOWLEDGE_BASE` array
- Categories: Taxation, Investments, Planning, Markets, Economy, Insurance, Retirement

**Implementation:**
1. **Keyword Search (Fallback):** 
   - Searches document keywords, titles, and content
   - Scores documents based on query match
   - Returns top K most relevant documents

2. **Semantic Search (Primary - if OpenAI API key available):**
   - Uses OpenAI `text-embedding-3-small` model
   - Generates embeddings for query and documents
   - Calculates cosine similarity
   - Returns most semantically similar documents

3. **Hybrid Approach:**
   - Tries semantic search first
   - Falls back to keyword search if embeddings unavailable
   - Both methods return structured context for LLM

**This is a proper RAG implementation** with:
- ✅ Document indexing
- ✅ Query embedding
- ✅ Similarity search
- ✅ Context retrieval
- ✅ Fallback mechanism

---

## 5. Auto-Login Fix

**Issue:** Dashboard was auto-logging in "Aggressive Trader" on page load

**Root Cause:** 
- Old demo user data persisted in `localStorage`
- `loadUserData()` wasn't clearing demo data before checking

**Fix Applied:**
1. **Clear demo data FIRST** before any checks
2. Only allow `provider === 'email'` users to persist
3. Demo profiles use `sessionStorage` (clears on tab close)
4. Added explicit cleanup on page load

**Code Location:** `aura-platform/public/dashboard.html` (lines ~1035-1098)

---

## Summary

✅ **Credit Score:** Calculated for onboarded users, fetched from MCP for demo accounts  
✅ **Data Storage:** In-memory for dev, database needed for production  
✅ **Demo Data:** 100% from Fi.Money MCP server, no hardcoding  
✅ **RAG:** Proper implementation with 13 documents, semantic + keyword search  
✅ **Auto-Login:** Fixed - demo accounts no longer persist login state

