#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                    AURA - AI Financial Intelligence Platform                 ║
# ║                                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                              ║"
echo "║     █████╗ ██╗   ██╗██████╗  █████╗                                          ║"
echo "║    ██╔══██╗██║   ██║██╔══██╗██╔══██╗                                         ║"
echo "║    ███████║██║   ██║██████╔╝███████║                                         ║"
echo "║    ██╔══██║██║   ██║██╔══██╗██╔══██║                                         ║"
echo "║    ██║  ██║╚██████╔╝██║  ██║██║  ██║                                         ║"
echo "║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝                                         ║"
echo "║                                                                              ║"
echo "║              AI Financial Intelligence Platform                              ║"
echo "║                                                                              ║"
echo "║                                                                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Paths
PLATFORM_DIR="$SCRIPT_DIR/aura-platform"
MCP_DIR="$SCRIPT_DIR/fi-mcp-dev"

# Kill any existing processes on our ports
kill_existing() {
    echo -e "${YELLOW}🔄 Stopping any existing processes on ports 3000 and 8080...${NC}"
    
    # Try multiple methods to kill processes on ports (cross-platform)
    # Method 1: Using lsof (macOS/Linux)
    if command -v lsof &> /dev/null; then
        for port in 3000 8080; do
            pids=$(lsof -ti:$port 2>/dev/null || echo "")
            if [ -n "$pids" ]; then
                echo -e "${YELLOW}   Killing processes on port $port: $pids${NC}"
                echo "$pids" | xargs kill -9 2>/dev/null || true
            fi
        done
    fi
    
    # Method 2: Using fuser (Linux)
    if command -v fuser &> /dev/null; then
        fuser -k 3000/tcp 2>/dev/null || true
        fuser -k 8080/tcp 2>/dev/null || true
    fi
    
    # Method 3: Kill by process name
    pkill -9 -f "node.*server.js" 2>/dev/null || true
    pkill -9 -f "node.*main.js" 2>/dev/null || true
    pkill -9 -f "node.*aura-platform" 2>/dev/null || true
    pkill -9 -f "node.*fi-mcp-dev" 2>/dev/null || true
    pkill -9 -f "go run.*fi-mcp-dev" 2>/dev/null || true
    
    # Wait for processes to fully terminate
    sleep 2
    
    # Verify ports are free
    if lsof -ti:3000 &>/dev/null || lsof -ti:8080 &>/dev/null; then
        echo -e "${RED}   Warning: Some processes may still be running. Waiting...${NC}"
        sleep 3
    fi
    
    echo -e "${GREEN}✅ Ports 3000 and 8080 are now available${NC}"
}

# Check if .env exists
check_env() {
    if [ ! -f "$PLATFORM_DIR/.env" ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
        cat > "$PLATFORM_DIR/.env" << EOF
# AURA Platform Configuration
NODE_ENV=development
PORT=3000

# Azure OpenAI Configuration (Primary)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_CHATGPT_DEPLOYMENT=gpt-4.1
AZURE_OPENAI_CHATGPT_MODEL=gpt-4.1
AZURE_OPENAI_API_VERSION=2025-01-01-preview

# OpenAI API Key (Alternative)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Fi MCP Service (localhost for development)
FI_MCP_URL=http://localhost:8080

# Silent fallback mode
SILENT_FALLBACK=true

# Market Data APIs (Optional)
TRUEDATA_API_KEY=
POLYGON_API_KEY=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF
        echo -e "${GREEN}✅ Created .env file. Please add your API keys.${NC}"
    fi
}

# Install dependencies
install_deps() {
    echo -e "\n${CYAN}📦 Installing dependencies...${NC}"
    
    # Install MCP server dependencies
    if [ -d "$MCP_DIR" ]; then
        echo -e "${BLUE}   Installing Fi MCP dependencies...${NC}"
        cd "$MCP_DIR"
        npm install --silent 2>/dev/null || npm install
    fi
    
    # Install platform dependencies
    echo -e "${BLUE}   Installing AURA Platform dependencies...${NC}"
    cd "$PLATFORM_DIR"
    npm install --silent 2>/dev/null || npm install
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Start MCP server
start_mcp() {
    echo -e "\n${CYAN}🔌 Starting Fi MCP Server...${NC}"
    
    if [ -d "$MCP_DIR" ]; then
        cd "$MCP_DIR"
        node main.js &
        MCP_PID=$!
        sleep 2
        
        if kill -0 $MCP_PID 2>/dev/null; then
            echo -e "${GREEN}✅ Fi MCP Server running on port 8080 (PID: $MCP_PID)${NC}"
        else
            echo -e "${YELLOW}⚠️  Fi MCP Server failed to start. Platform will use fallback data.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Fi MCP directory not found. Platform will use fallback data.${NC}"
    fi
}

# Start main platform
start_platform() {
    echo -e "\n${CYAN}🚀 Starting AURA Platform...${NC}"
    
    cd "$PLATFORM_DIR"
    node server.js &
    PLATFORM_PID=$!
    sleep 3
    
    if kill -0 $PLATFORM_PID 2>/dev/null; then
        echo -e "${GREEN}✅ AURA Platform running on port 3000 (PID: $PLATFORM_PID)${NC}"
    else
        echo -e "${RED}❌ AURA Platform failed to start${NC}"
        exit 1
    fi
}

# Print status
print_status() {
    echo -e "\n${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎉 AURA Platform is now running!${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "   ${CYAN}🌐 Dashboard:${NC}    http://localhost:3000"
    echo -e "   ${CYAN}💬 Chat:${NC}         http://localhost:3000"
    echo -e "   ${CYAN}📊 API Health:${NC}   http://localhost:3000/api/health"
    echo -e "   ${CYAN}🔌 MCP Server:${NC}   http://localhost:8080"
    echo ""
    echo -e "   ${YELLOW}Demo Phone Numbers:${NC}"
    echo -e "   • 2222222222 (Growth Profile)"
    echo -e "   • 8888888888 (Conservative)"
    echo -e "   • 4444444444 (Aggressive)"
    echo ""
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
}

# Cleanup on exit
cleanup() {
    echo -e "\n\n${YELLOW}🛑 Shutting down AURA Platform...${NC}"
    
    if [ ! -z "$PLATFORM_PID" ]; then
        kill $PLATFORM_PID 2>/dev/null || true
        echo -e "${GREEN}   Stopped AURA Platform${NC}"
    fi
    
    if [ ! -z "$MCP_PID" ]; then
        kill $MCP_PID 2>/dev/null || true
        echo -e "${GREEN}   Stopped Fi MCP Server${NC}"
    fi
    
    # Kill any remaining node processes for this project
    pkill -f "node.*aura-platform" 2>/dev/null || true
    pkill -f "node.*fi-mcp-dev" 2>/dev/null || true
    
    echo -e "${GREEN}✅ All services stopped. Goodbye!${NC}"
    exit 0
}

# Trap signals
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    kill_existing
    check_env
    install_deps
    start_mcp
    start_platform
    print_status
    
    # Keep script running
    while true; do
        sleep 1
    done
}

# Run main
main





