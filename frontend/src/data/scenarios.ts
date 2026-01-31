/**
 * Pre-programmed failure scenarios with evidence for explainability
 */

export interface FailureScenario {
    id: string;
    merchant: string;
    title: string;
    category: 'api_mismatch' | 'webhook_secret' | 'cors_policy';
    severity: 'high' | 'critical' | 'medium';
    timestamp: Date;
    status: 'error' | 'investigating' | 'fixing' | 'resolved';

    // Error details
    errorLog: string;
    errorCode: number;
    endpoint?: string;

    // Root cause analysis
    rootCause: string;

    // Fix details
    fix: {
        description: string;
        action: string;
        code?: string;
    };

    // Evidence for explainability
    evidence: {
        type: 'documentation' | 'log' | 'config';
        source: string;
        excerpt: string;
        lineNumber?: number;
    };
}

export const FAILURE_SCENARIOS: FailureScenario[] = [
    // Scenario A: API Mismatch (404)
    {
        id: 'sc-001',
        merchant: 'FashionHub',
        title: 'API Endpoint Not Found - Orders API',
        category: 'api_mismatch',
        severity: 'critical',
        timestamp: new Date(),
        status: 'error',
        errorLog: 'GET /v2/orders HTTP/1.1 → 404 Not Found',
        errorCode: 404,
        endpoint: '/v2/orders',
        rootCause: 'Merchant is calling deprecated /v2/orders endpoint. Migration to Headless requires /v3/orders with new authentication.',
        fix: {
            description: 'Update endpoint URL from /v2/orders to /v3/orders',
            action: 'endpoint_update',
            code: `// Old (deprecated)
fetch('/api/v2/orders', { headers })

// New (Headless)
fetch('/api/v3/orders', { 
  headers: { 
    ...headers,
    'X-API-Version': '3.0' 
  }
})`,
        },
        evidence: {
            type: 'documentation',
            source: 'Migration Guide v3.0',
            excerpt: `API Version Update Required:
All merchants migrating to Headless must update 
from /v2/* endpoints to /v3/* endpoints.
The v2 API will be deprecated on 2024-03-01.`,
            lineNumber: 142,
        },
    },

    // Scenario B: Webhook Secret (401)
    {
        id: 'sc-002',
        merchant: 'TechMart',
        title: 'Webhook Authentication Failed',
        category: 'webhook_secret',
        severity: 'high',
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
        status: 'error',
        errorLog: 'POST /webhooks/orders → 401 Unauthorized: Invalid signature',
        errorCode: 401,
        endpoint: '/webhooks/orders',
        rootCause: "Merchant didn't update the Webhook Secret key after switching to the Headless dashboard. Old secret is still configured.",
        fix: {
            description: 'Regenerate and sync webhook secret keys',
            action: 'regenerate_webhook_secret',
            code: `// Dashboard > Settings > Webhooks
1. Click "Regenerate Secret"
2. Copy new secret: whsec_xxxx...
3. Update environment variable:
   WEBHOOK_SECRET=whsec_xxxx...
4. Restart webhook handler`,
        },
        evidence: {
            type: 'log',
            source: 'webhook_handler.log',
            excerpt: `[ERROR] Signature verification failed
Expected: sha256=a1b2c3d4e5f6...
Received: sha256=x9y8z7w6v5u4...
Secret mismatch detected. Merchant may be 
using pre-migration webhook secret.`,
            lineNumber: 847,
        },
    },

    // Scenario C: CORS Policy (Blocked)
    {
        id: 'sc-003',
        merchant: 'SportsGear',
        title: 'CORS Policy Blocking Requests',
        category: 'cors_policy',
        severity: 'high',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        status: 'error',
        errorLog: "Access to fetch at 'https://api.platform.com' from origin 'https://new.sportsgear.com' has been blocked by CORS policy",
        errorCode: 0,
        endpoint: 'https://api.platform.com',
        rootCause: "The new headless frontend domain (new.sportsgear.com) isn't whitelisted in the backend CORS configuration.",
        fix: {
            description: 'Add new frontend domain to CORS allowlist',
            action: 'update_cors_allowlist',
            code: `// cors_config.json
{
  "allowedOrigins": [
    "https://sportsgear.com",
    "https://new.sportsgear.com",  // ADD THIS
    "https://staging.sportsgear.com"
  ]
}`,
        },
        evidence: {
            type: 'config',
            source: 'Platform Settings > CORS Configuration',
            excerpt: `Current allowed origins:
- https://sportsgear.com (legacy)
- https://staging.sportsgear.com

Missing: https://new.sportsgear.com
(Headless frontend domain)`,
        },
    },
];

export function getScenarioById(id: string): FailureScenario | undefined {
    return FAILURE_SCENARIOS.find(s => s.id === id);
}

export function getScenarioByMerchant(merchant: string): FailureScenario | undefined {
    return FAILURE_SCENARIOS.find(s => s.merchant.toLowerCase() === merchant.toLowerCase());
}

export function updateScenarioStatus(id: string, status: FailureScenario['status']): void {
    const scenario = FAILURE_SCENARIOS.find(s => s.id === id);
    if (scenario) {
        scenario.status = status;
    }
}
