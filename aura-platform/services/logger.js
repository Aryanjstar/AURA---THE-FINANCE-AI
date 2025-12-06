/**
 * AURA Financial Platform - Professional Logging System
 * 
 * Enterprise-grade logging with:
 * - Colored console output
 * - File logging to app.log
 * - Structured JSON logs
 * - Request tracing
 * - Performance metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgCyan: '\x1b[46m'
};

// Component emojis
const componentEmojis = {
    STRATEGIST: '🎯',
    QUANT: '🔢',
    DOER: '⚡',
    REALIST: '📈',
    COMMUNICATOR: '💬',
    ORCHESTRATOR: '🎭',
    MCP: '🔗',
    API: '🌐',
    RAG: '📚',
    MARKET: '📊',
    AUTH: '🔐',
    SYSTEM: '⚙️',
    OPENAI: '🤖',
    CHAT: '💭'
};

class Logger {
    constructor(component = 'SYSTEM') {
        this.component = component;
        this.emoji = componentEmojis[component.toUpperCase()] || '📝';
        this.logsDir = path.join(__dirname, '..', 'logs');
        this.logFile = path.join(this.logsDir, 'app.log');
        this.ensureLogsDir();
    }

    ensureLogsDir() {
        try {
            if (!fs.existsSync(this.logsDir)) {
                fs.mkdirSync(this.logsDir, { recursive: true });
            }
        } catch (err) {
            // Silent fail
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    formatForFile(level, message, data = null) {
        const logEntry = {
            timestamp: this.getTimestamp(),
            level: level,
            component: this.component,
            message: message,
            ...(data && { data })
        };
        return JSON.stringify(logEntry);
    }

    writeToFile(logLine) {
        try {
            fs.appendFileSync(this.logFile, logLine + '\n');
        } catch (err) {
            // Silent fail
        }
    }

    formatConsole(level, message) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        return `[${time}] ${this.emoji} [${this.component}] ${message}`;
    }

    debug(message, data = null) {
        const formatted = this.formatConsole('DEBUG', message);
        console.log(`${colors.dim}${formatted}${colors.reset}`, data || '');
        this.writeToFile(this.formatForFile('DEBUG', message, data));
    }

    info(message, data = null) {
        const formatted = this.formatConsole('INFO', message);
        console.log(`${colors.cyan}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('INFO', message, data));
    }

    success(message, data = null) {
        const formatted = this.formatConsole('SUCCESS', message);
        console.log(`${colors.green}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('SUCCESS', message, data));
    }

    warn(message, data = null) {
        const formatted = this.formatConsole('WARN', `⚠️ [WARN] ${message}`);
        console.log(`${colors.yellow}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('WARN', message, data));
    }

    error(message, data = null) {
        const formatted = this.formatConsole('ERROR', `❌ [ERROR] ${message}`);
        console.error(`${colors.red}${formatted}${colors.reset}`, data || '');
        this.writeToFile(this.formatForFile('ERROR', message, data));
    }

    agent(agentName, message, data = null) {
        const emoji = componentEmojis[agentName.toUpperCase()] || '🤖';
        const formatted = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${emoji} [AGENT:${agentName.toUpperCase()}] ${message}`;
        console.log(`${colors.magenta}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('AGENT', `[${agentName}] ${message}`, data));
    }

    mcp(message, data = null) {
        const formatted = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] 🔗 [MCP] ${message}`;
        console.log(`${colors.blue}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('MCP', message, data));
    }

    api(message, data = null) {
        const formatted = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] 🌐 [API] ${message}`;
        console.log(`${colors.cyan}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('API', message, data));
    }

    rag(message, data = null) {
        const formatted = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] 📚 [RAG] ${message}`;
        console.log(`${colors.magenta}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('RAG', message, data));
    }

    openai(message, data = null) {
        const formatted = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] 🤖 [OPENAI] ${message}`;
        console.log(`${colors.green}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('OPENAI', message, data));
    }

    market(message, data = null) {
        const formatted = `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] 📊 [MARKET] ${message}`;
        console.log(`${colors.cyan}${formatted}${colors.reset}`, data ? JSON.stringify(data, null, 2) : '');
        this.writeToFile(this.formatForFile('MARKET', message, data));
    }

    divider() {
        const line = '─'.repeat(60);
        console.log(`${colors.dim}${line}${colors.reset}`);
        this.writeToFile(this.formatForFile('DIVIDER', line));
    }

    // Chat flow logging - comprehensive logging for the entire request
    chatFlow(requestId, stage, message, data = null, durationMs = null) {
        const stages = {
            'START': '🚀',
            'VALIDATION': '✅',
            'RAG': '📚',
            'MARKET': '📊',
            'INTENT': '🎯',
            'AGENT_START': '🤖',
            'AGENT_COMPLETE': '✓',
            'MCP_CALL': '🔗',
            'SYNTHESIS': '🔄',
            'COMPLETE': '✅',
            'ERROR': '❌'
        };

        const emoji = stages[stage] || '📝';
        const duration = durationMs ? ` (${durationMs}ms)` : '';
        const logMessage = `[REQUEST:${requestId}] [${stage}] ${emoji} ${message}${duration}`;
        
        console.log(`${colors.cyan}[${new Date().toLocaleTimeString('en-US', { hour12: false })}]${colors.reset} ${logMessage}`);
        
        // Write structured log to file
        const logEntry = {
            timestamp: this.getTimestamp(),
            requestId,
            stage,
            message,
            durationMs,
            ...(data && { data })
        };
        this.writeToFile(JSON.stringify(logEntry));
    }
}

// Create default logger instance
const logger = new Logger('SYSTEM');

// Export pre-configured loggers for different components
export const systemLogger = new Logger('SYSTEM');
export const agentLogger = new Logger('AGENT');
export const mcpLogger = new Logger('MCP');
export const apiLogger = new Logger('API');
export const ragLogger = new Logger('RAG');
export const openaiLogger = new Logger('OPENAI');
export const marketLogger = new Logger('MARKET');
export const chatLogger = new Logger('CHAT');

export { logger, Logger };
export default logger;
