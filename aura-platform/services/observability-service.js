/**
 * Observability Service - LangSmith Integration
 * AURA Financial Platform
 * 
 * Provides tracing and monitoring for agent runs using LangSmith
 */

import { Client } from 'langsmith';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';

class ObservabilityService {
    constructor() {
        this.enabled = process.env.LANGCHAIN_TRACING_V2 === 'true';
        this.client = null;
        this.projectName = process.env.LANGCHAIN_PROJECT || 'aura-finance';
        
        if (this.enabled && process.env.LANGCHAIN_API_KEY) {
            try {
                this.client = new Client({
                    apiKey: process.env.LANGCHAIN_API_KEY,
                    apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'
                });
                logger.info('📊 LangSmith observability enabled');
            } catch (error) {
                logger.warn('⚠️ LangSmith client initialization failed:', error.message);
                this.enabled = false;
            }
        } else {
            logger.info('📊 LangSmith observability disabled (no API key or LANGCHAIN_TRACING_V2 not set)');
        }
    }

    /**
     * Start a new trace run for an agent
     */
    async startAgentRun(agentName, inputs, metadata = {}) {
        if (!this.enabled || !this.client) {
            return { runId: uuidv4(), trace: null };
        }

        const runId = uuidv4();
        
        try {
            await this.client.createRun({
                id: runId,
                project_name: this.projectName,
                name: `Agent: ${agentName}`,
                run_type: 'chain',
                inputs: {
                    query: inputs.query || inputs.message,
                    context: inputs.context || {},
                    ...inputs
                },
                extra: {
                    metadata: {
                        agent: agentName,
                        timestamp: new Date().toISOString(),
                        ...metadata
                    }
                }
            });
            
            logger.debug(`📊 Started trace for ${agentName}: ${runId}`);
            return { runId, trace: true };
        } catch (error) {
            logger.warn(`⚠️ Failed to start trace: ${error.message}`);
            return { runId, trace: null };
        }
    }

    /**
     * End a trace run with outputs
     */
    async endAgentRun(runId, outputs, error = null) {
        if (!this.enabled || !this.client) return;

        try {
            await this.client.updateRun(runId, {
                outputs: error ? { error: error.message } : outputs,
                end_time: new Date().toISOString(),
                error: error ? error.message : undefined
            });
            
            logger.debug(`📊 Ended trace: ${runId}`);
        } catch (err) {
            logger.warn(`⚠️ Failed to end trace: ${err.message}`);
        }
    }

    /**
     * Create a child run for sub-operations
     */
    async createChildRun(parentRunId, name, inputs, runType = 'chain') {
        if (!this.enabled || !this.client) {
            return { runId: uuidv4(), trace: null };
        }

        const runId = uuidv4();
        
        try {
            await this.client.createRun({
                id: runId,
                parent_run_id: parentRunId,
                project_name: this.projectName,
                name,
                run_type: runType,
                inputs
            });
            
            return { runId, trace: true };
        } catch (error) {
            logger.warn(`⚠️ Failed to create child run: ${error.message}`);
            return { runId, trace: null };
        }
    }

    /**
     * Log feedback for a run (user rating, etc.)
     */
    async logFeedback(runId, score, comment = '') {
        if (!this.enabled || !this.client) return;

        try {
            await this.client.createFeedback(runId, 'user-rating', {
                score,
                comment
            });
            logger.debug(`📊 Logged feedback for: ${runId}`);
        } catch (error) {
            logger.warn(`⚠️ Failed to log feedback: ${error.message}`);
        }
    }

    /**
     * Get metrics summary for the project
     */
    async getMetricsSummary() {
        if (!this.enabled || !this.client) {
            return {
                enabled: false,
                message: 'LangSmith observability not configured'
            };
        }

        try {
            // Get recent runs count
            const runs = await this.client.listRuns({
                projectName: this.projectName,
                limit: 100
            });

            const runsList = [];
            for await (const run of runs) {
                runsList.push(run);
            }

            const successfulRuns = runsList.filter(r => !r.error);
            const errorRuns = runsList.filter(r => r.error);
            const avgLatency = runsList.length > 0
                ? runsList.reduce((sum, r) => {
                    if (r.end_time && r.start_time) {
                        return sum + (new Date(r.end_time) - new Date(r.start_time));
                    }
                    return sum;
                }, 0) / runsList.length
                : 0;

            return {
                enabled: true,
                projectName: this.projectName,
                totalRuns: runsList.length,
                successfulRuns: successfulRuns.length,
                errorRuns: errorRuns.length,
                successRate: runsList.length > 0 
                    ? ((successfulRuns.length / runsList.length) * 100).toFixed(1) + '%'
                    : 'N/A',
                avgLatencyMs: Math.round(avgLatency),
                dashboardUrl: `https://smith.langchain.com/o/${this.projectName}`
            };
        } catch (error) {
            return {
                enabled: true,
                error: error.message,
                message: 'Failed to fetch metrics'
            };
        }
    }

    /**
     * Create metrics for agent performance tracking
     */
    getAgentMetrics() {
        return {
            agents: {
                strategist: { calls: 0, avgTime: 0, errors: 0 },
                quant: { calls: 0, avgTime: 0, errors: 0 },
                doer: { calls: 0, avgTime: 0, errors: 0 },
                realist: { calls: 0, avgTime: 0, errors: 0 },
                communicator: { calls: 0, avgTime: 0, errors: 0 }
            },
            lastUpdated: new Date().toISOString()
        };
    }
}

// Export singleton
export const observabilityService = new ObservabilityService();
export default observabilityService;

