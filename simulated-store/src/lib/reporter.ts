/**
 * Reporter - Sends error signals to the self-healing agent
 */

const AGENT_URL = 'http://localhost:8000';

export interface StoreError {
    type: 'checkout_event' | 'api_error' | 'webhook_failure' | 'ticket';
    title: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    chaosMode?: string; // Which chaos mode caused this
}

export async function reportToAgent(error: StoreError): Promise<void> {
    try {
        await fetch(`${AGENT_URL}/webhooks/generic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: error.type,
                source: 'simulated_store',
                merchant_id: 'demo_store_001',
                title: error.title,
                severity: error.severity,
                content: {
                    ...error.details,
                    chaos_mode: error.chaosMode,
                    store_url: 'http://localhost:3001',
                    fix_endpoint: 'http://localhost:3001/api/chaos/fix',
                },
                metadata: {
                    store_version: '1.0.0',
                    environment: 'demo',
                }
            }),
        });
        console.log(`[Reporter] Sent error to agent: ${error.title}`);
    } catch (e) {
        console.error('[Reporter] Failed to report to agent:', e);
    }
}

export async function reportCheckoutFailure(details: {
    orderId: string;
    cartValue: number;
    errorMessage: string;
    chaosMode: string;
}): Promise<void> {
    await reportToAgent({
        type: 'checkout_event',
        title: `Checkout Failed: ${details.errorMessage}`,
        severity: 'critical',
        chaosMode: details.chaosMode,
        details: {
            order_id: details.orderId,
            cart_value: details.cartValue,
            error_message: details.errorMessage,
            stage: 'payment',
            customer_impact: 'Order abandoned',
        },
    });
}

export async function reportApiError(details: {
    endpoint: string;
    statusCode: number;
    errorMessage: string;
    chaosMode: string;
}): Promise<void> {
    await reportToAgent({
        type: 'api_error',
        title: `API Error: ${details.endpoint} returned ${details.statusCode}`,
        severity: 'high',
        chaosMode: details.chaosMode,
        details: {
            endpoint: details.endpoint,
            status_code: details.statusCode,
            error_message: details.errorMessage,
        },
    });
}
