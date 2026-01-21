# 🚀 AURA - AI-Powered Financial Intelligence Platform

<div align="center">

![AURA Logo](https://img.shields.io/badge/AURA-Financial_AI-00D4FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTE2IDJMMTI0IDE2TDE2IDMwTDI4IDE2TDE2IDJaIiBmaWxsPSIjMDBENEZGIi8+PC9zdmc+)

**Your Personal AI Financial Advisor for India**

_Powered by Azure OpenAI GPT-4.1 & Multi-Agent Architecture with Fi.Money MCP Integration_

[![Azure](https://img.shields.io/badge/Azure-Deployed-0089D6?style=for-the-badge&logo=microsoftazure)](https://azure.microsoft.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)](https://mongodb.com/)

</div>

---

### 🎬 Video Walkthrough  
See AURA in action!

https://github.com/user-attachments/assets/9b51bcbc-746c-40b7-bed6-de4b6bc509ea

🔇 *Note: The GitHub-hosted video below may be muted by default due to browser restrictions. Please unmute to hear the audio.*



📽️ Demo Video:  



<p align="center">
  ▶️ Prefer YouTube? <a href="https://youtu.be/3q4uTliRNr8">Watch it here</a>
</p>

---

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🤖 AI Agents](#-ai-agents)
- [🚀 Quick Start](#-quick-start)
- [☁️ Deployment](#️-deployment)
- [🔌 API Reference](#-api-reference)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)

---

## 🎯 Overview

**AURA** is an advanced AI-powered financial intelligence platform that combines **5 specialized AI agents** with real-time financial data from Fi.Money MCP to provide personalized financial strategies, quantitative analysis, and actionable insights for Indian investors.

### 🌟 Key Highlights

- **🤖 Multi-Agent AI**: 5 specialized financial AI agents working in orchestration
- **📊 Real-Time Data**: Live financial data via Fi.Money MCP integration
- **🗄️ MongoDB Atlas**: Persistent storage for users, chat history, and analyses
- **☁️ Azure Deployment**: Deployed on Microsoft Azure App Service
- **📱 Modern UI**: Responsive design with glass morphism aesthetics
- **⚡ Real-Time Chat**: Interactive financial consultation with progress tracking
- **🔒 Secure Auth**: Google OAuth + Email authentication

---

## ✨ Features

### 🎯 Core Capabilities

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-Agent AI** | 5 specialized agents for comprehensive analysis | ✅ |
| **Fi.Money MCP** | Real-time financial data integration | ✅ |
| **RAG Knowledge Base** | Financial knowledge retrieval | ✅ |
| **Portfolio Analytics** | Net worth, investments, transactions | ✅ |
| **Credit Reports** | Credit score and history | ✅ |
| **Chat History** | Persistent, user-isolated conversations | ✅ |
| **Demo Accounts** | 3 pre-configured demo profiles | ✅ |
| **Google OAuth** | Secure authentication | ✅ |

### 📊 Dashboard Features

- **💰 Net Worth Tracking**: Real-time portfolio valuation
- **📈 Investment Analysis**: Mutual funds & stocks breakdown
- **💳 Credit Score**: Credit report integration
- **📋 Transaction History**: Recent financial activities
- **🎯 Portfolio Chart**: Visual asset allocation
- **🔀 Profile Shuffle**: Switch between demo MCP profiles

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AURA Platform                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Chat UI   │  │  Dashboard  │  │ Onboarding  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                 │                │
│  ┌──────┴────────────────┴─────────────────┴──────┐        │
│  │              Express.js + Socket.IO            │        │
│  └──────┬────────────────┬─────────────────┬──────┘        │
│         │                │                 │                │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐        │
│  │   Agent     │  │  MongoDB    │  │  Fi.Money   │        │
│  │Orchestrator │  │   Atlas     │  │    MCP      │        │
│  └──────┬──────┘  └─────────────┘  └─────────────┘        │
│         │                                                   │
│  ┌──────┴─────────────────────────────────────────┐        │
│  │           5 AI Agents (Azure OpenAI)           │        │
│  │  ┌─────────┬─────────┬─────────┬─────────┐     │        │
│  │  │Strategist│ Quant  │  Doer   │Realist  │     │        │
│  │  └─────────┴─────────┴─────────┴─────────┘     │        │
│  │              ┌─────────────┐                    │        │
│  │              │Communicator │                    │        │
│  │              └─────────────┘                    │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Agents

AURA's intelligence comes from **5 specialized AI agents** powered by Azure OpenAI GPT-4.1:

| Agent | Role | Capabilities |
|-------|------|--------------|
| 🎯 **Strategist** | Financial Planning | Goal planning, risk assessment, asset allocation |
| 🔢 **Quant** | Quantitative Analysis | XIRR/CAGR calculations, volatility analysis |
| ⚡ **Doer** | Implementation | Action plans, platform guidance, timelines |
| 📈 **Realist** | Market Intelligence | Data validation, market insights |
| 💬 **Communicator** | User Engagement | Personalized responses, progress updates |

### Agent Execution

- **Simple queries**: 2 agents (fast response)
- **Medium complexity**: 3 agents
- **Complex queries**: All 5 agents in parallel groups

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **MongoDB** (Atlas or local)
- **Azure OpenAI** API access

### ⚡ Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Aryanjstar/AURA---THE-FINANCE-AI.git
cd AURA---THE-FINANCE-AI

# 2. Install dependencies
cd aura-platform
npm install

# 3. Set up environment variables
cp env.sample .env
# Edit .env with your API keys

# 4. Start the server
npm start
# Platform runs on http://localhost:3000
```

### 🔑 Environment Variables

Create `.env` in `aura-platform/`:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_CHATGPT_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aura_finance

# Fi.Money MCP
FI_MCP_URL=https://your-mcp-server.azurewebsites.net

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Application
NODE_ENV=development
PORT=3000
```

### 🌐 Access Points

- **Main App**: http://localhost:3000
- **Dashboard**: http://localhost:3000/dashboard.html
- **API Health**: http://localhost:3000/api/health

### 🎮 Demo Accounts

| Profile | Phone | Description |
|---------|-------|-------------|
| 📈 Growth Investor | 2222222222 | Large MF portfolio |
| 🛡️ Conservative Saver | 8888888888 | Stable investments |
| 🚀 Aggressive Trader | 4444444444 | High-risk portfolio |

---

## ☁️ Deployment

### Azure App Service

```bash
# Login to Azure
az login

# Create resource group
az group create --name aura-rg --location centralindia

# Create App Service plan
az appservice plan create --name aura-plan --resource-group aura-rg --sku B1 --is-linux

# Create Web App
az webapp create --resource-group aura-rg --plan aura-plan --name aura-finance --runtime "NODE:20-lts"

# Configure environment variables
az webapp config appsettings set --resource-group aura-rg --name aura-finance --settings \
  AZURE_OPENAI_ENDPOINT="your-endpoint" \
  AZURE_OPENAI_API_KEY="your-key" \
  MONGODB_URI="your-mongodb-uri" \
  FI_MCP_URL="your-mcp-url"

# Deploy from GitHub
az webapp deployment source config --name aura-finance --resource-group aura-rg \
  --repo-url https://github.com/Aryanjstar/AURA---THE-FINANCE-AI \
  --branch main --manual-integration
```

---

## 🔌 API Reference

### Chat API

```http
POST /api/chat
Content-Type: application/json

{
  "message": "I'm 25, earning ₹80,000/month. How should I invest?",
  "sessionId": "user-session-123",
  "userId": "user@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on your profile...",
  "agentsUsed": ["Strategist", "Quant", "Doer", "Realist", "Communicator"],
  "complexity": "complex",
  "intent": "portfolio_planning",
  "executionTime": "12.5s"
}
```

### Fi.Money MCP APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fi-mcp/net-worth` | POST | Get net worth data |
| `/api/fi-mcp/transactions` | POST | Bank transactions |
| `/api/fi-mcp/credit-report` | POST | Credit score & report |
| `/api/fi-mcp/mf-transactions` | POST | Mutual fund data |
| `/api/fi-mcp/stock-transactions` | POST | Stock holdings |

### Chat Session APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/sessions/:userId` | GET | Get user's chat sessions |
| `/api/chat/session/:sessionId` | GET | Get specific session |
| `/api/chat/new` | POST | Create new chat session |
| `/api/chat/history/:sessionId` | GET | Get chat messages |

---

## 📁 Project Structure

```
AURA-THE-FINANCE-AI/
├── aura-platform/              # Main Node.js application
│   ├── agents/                 # AI agent implementations
│   │   ├── strategist.js       # Strategic planning
│   │   ├── quant.js            # Quantitative analysis
│   │   ├── doer.js             # Action planning
│   │   ├── realist.js          # Market intelligence
│   │   └── communicator.js     # User communication
│   ├── orchestrator/
│   │   └── agent-orchestrator.js  # Multi-agent coordination
│   ├── services/
│   │   ├── fi-mcp-client.js    # Fi.Money MCP client
│   │   ├── mongodb-service.js  # Database operations
│   │   ├── openai-service.js   # Azure OpenAI client
│   │   ├── rag-service.js      # Knowledge retrieval
│   │   └── logger.js           # Logging service
│   ├── public/
│   │   ├── index.html          # Main landing + chat
│   │   ├── dashboard.html      # Financial dashboard
│   │   ├── auth.html           # Authentication
│   │   └── onboarding.html     # User onboarding
│   ├── server.js               # Express server
│   ├── package.json
│   └── env.sample              # Environment template
├── fi-mcp-dev/                 # Fi.Money MCP Server (Node.js)
│   ├── main.js                 # MCP server
│   └── package.json
└── README.md
```

---

## 🔧 Configuration

### Tech Stack

| Component | Technology |
|-----------|------------|
| **AI Model** | Azure OpenAI GPT-4.1 |
| **Backend** | Node.js + Express |
| **Real-time** | Socket.IO |
| **Database** | MongoDB Atlas |
| **Financial Data** | Fi.Money MCP |
| **Authentication** | Google OAuth + Email |
| **Deployment** | Azure App Service |

### Security Features

- ✅ Rate limiting (100 req/15min)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ User-isolated chat history
- ✅ Secure API key handling

---

## 🙏 Acknowledgments

- **Microsoft Azure** for cloud infrastructure
- **OpenAI** for GPT-4.1 language model
- **Fi.Money** for MCP financial data integration
- **MongoDB** for database services

---

<div align="center">

**Built with ❤️ by Team Trinethra**

[![GitHub](https://img.shields.io/badge/GitHub-Aryanjstar-181717?style=for-the-badge&logo=github)](https://github.com/Aryanjstar/AURA---THE-FINANCE-AI)
[![Live Demo](https://img.shields.io/badge/Live-aura--finance--ai.azurewebsites.net-00D4FF?style=for-the-badge)](https://aura-finance-ai.azurewebsites.net)

_Making financial intelligence accessible to everyone_ 🚀

</div>
