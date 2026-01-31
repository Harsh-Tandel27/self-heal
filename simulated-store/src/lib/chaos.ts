/**
 * Chaos Engine - Controls failure modes in the store
 * The agent can call APIs to disable these modes (real fixes!)
 */

export interface ChaosState {
    checkout_fails: boolean;
    api_errors: boolean;
    webhook_drops: boolean;
    migration_mode: boolean;
    slow_mode: boolean;
}

// Global chaos state - In real app would be in Redis/DB
let chaosState: ChaosState = {
    checkout_fails: false,
    api_errors: false,
    webhook_drops: false,
    migration_mode: false,
    slow_mode: false,
};

// Failure rates when chaos is enabled
const FAILURE_RATES = {
    checkout_fails: 0.8,  // 80% fail rate
    api_errors: 0.5,      // 50% error rate  
    webhook_drops: 0.7,   // 70% drop rate
    migration_mode: 1.0,  // Always fails old endpoints
    slow_mode: 1.0,       // Always slow
};

export function getChaosState(): ChaosState {
    return { ...chaosState };
}

export function setChaosMode(mode: keyof ChaosState, enabled: boolean): void {
    chaosState[mode] = enabled;
}

export function enableChaos(mode: keyof ChaosState): void {
    chaosState[mode] = true;
}

export function disableChaos(mode: keyof ChaosState): void {
    chaosState[mode] = false;
}

export function disableAllChaos(): void {
    chaosState = {
        checkout_fails: false,
        api_errors: false,
        webhook_drops: false,
        migration_mode: false,
        slow_mode: false,
    };
}

export function shouldFail(mode: keyof ChaosState): boolean {
    if (!chaosState[mode]) return false;
    return Math.random() < FAILURE_RATES[mode];
}

export async function simulateDelay(): Promise<void> {
    if (chaosState.slow_mode) {
        const delay = 3000 + Math.random() * 7000; // 3-10 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Agent fix token - for security
const AGENT_FIX_TOKEN = 'self-healing-agent-token';

export function validateAgentToken(token: string): boolean {
    return token === AGENT_FIX_TOKEN;
}
