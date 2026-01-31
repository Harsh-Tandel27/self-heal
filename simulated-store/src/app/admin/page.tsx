'use client';

import { useState, useEffect } from 'react';

interface ChaosState {
    checkout_fails: boolean;
    api_errors: boolean;
    webhook_drops: boolean;
    migration_mode: boolean;
    slow_mode: boolean;
}

const CHAOS_DESCRIPTIONS: Record<keyof ChaosState, { name: string; desc: string; icon: string }> = {
    checkout_fails: {
        name: 'Checkout Failures',
        desc: '80% of checkouts fail with payment timeout',
        icon: '💳',
    },
    api_errors: {
        name: 'API Errors',
        desc: 'Product API randomly returns 500 errors',
        icon: '🔌',
    },
    webhook_drops: {
        name: 'Webhook Drops',
        desc: 'Order webhooks fail to deliver',
        icon: '📡',
    },
    migration_mode: {
        name: 'Migration Mode',
        desc: 'Simulates broken endpoints after headless migration',
        icon: '🔄',
    },
    slow_mode: {
        name: 'Slow Mode',
        desc: 'All API calls take 3-10 seconds',
        icon: '🐢',
    },
};

export default function AdminPage() {
    const [chaosState, setChaosState] = useState<ChaosState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChaosState();
        const interval = setInterval(fetchChaosState, 2000);
        return () => clearInterval(interval);
    }, []);

    async function fetchChaosState() {
        try {
            const res = await fetch('/api/chaos');
            const data = await res.json();
            setChaosState(data.chaos_state);
        } catch (e) {
            console.error('Failed to fetch chaos state:', e);
        } finally {
            setLoading(false);
        }
    }

    async function toggleChaos(mode: keyof ChaosState) {
        try {
            await fetch('/api/chaos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle', mode }),
            });
            fetchChaosState();
        } catch (e) {
            console.error('Failed to toggle chaos:', e);
        }
    }

    async function disableAll() {
        try {
            await fetch('/api/chaos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disable_all' }),
            });
            fetchChaosState();
        } catch (e) {
            console.error('Failed to disable all:', e);
        }
    }

    const anyActive = chaosState && Object.values(chaosState).some(v => v);

    return (
        <div style={{ padding: '40px 0', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700 }}>
                    ⚡ Chaos Control Panel
                </h1>
                <p style={{ color: '#64748b', marginTop: 8 }}>
                    Enable failure modes to test the self-healing agent.
                    The agent will detect issues and <strong>actually fix them</strong> via API.
                </p>
            </div>

            {anyActive && (
                <div style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: 'white',
                    padding: 20,
                    borderRadius: 12,
                    marginBottom: 24,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div>
                        <strong style={{ fontSize: 18 }}>🔥 Chaos Active!</strong>
                        <p style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                            Errors are being generated and sent to the agent
                        </p>
                    </div>
                    <button onClick={disableAll} className="btn" style={{ background: 'white', color: '#dc2626' }}>
                        Disable All
                    </button>
                </div>
            )}

            <div className="chaos-panel">
                <h2 style={{ marginBottom: 16, fontSize: 18 }}>Failure Modes</h2>

                {loading ? (
                    <p style={{ opacity: 0.7 }}>Loading...</p>
                ) : chaosState ? (
                    Object.entries(CHAOS_DESCRIPTIONS).map(([key, info]) => (
                        <div key={key} className="chaos-toggle">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 24 }}>{info.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{info.name}</div>
                                    <div style={{ fontSize: 12, opacity: 0.7 }}>{info.desc}</div>
                                </div>
                            </div>
                            <div
                                className={`toggle-switch ${chaosState[key as keyof ChaosState] ? 'active' : ''}`}
                                onClick={() => toggleChaos(key as keyof ChaosState)}
                            />
                        </div>
                    ))
                ) : (
                    <p style={{ opacity: 0.7 }}>Error loading state</p>
                )}
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 12 }}>🤖 Agent Integration</h3>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
                    When chaos modes are enabled, errors are sent to the self-healing agent at
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>
                        localhost:8000
                    </code>
                </p>
                <p style={{ color: '#64748b', fontSize: 14 }}>
                    The agent can <strong>fix issues</strong> by calling
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, marginLeft: 8 }}>
                        POST /api/chaos
                    </code>
                    to disable chaos modes.
                </p>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 12 }}>📋 Test Workflow</h3>
                <ol style={{ color: '#64748b', fontSize: 14, paddingLeft: 20 }}>
                    <li style={{ marginBottom: 8 }}>Enable "Checkout Failures" above</li>
                    <li style={{ marginBottom: 8 }}>Go to <a href="/cart" style={{ color: '#4f46e5' }}>Cart</a> and try to checkout</li>
                    <li style={{ marginBottom: 8 }}>Watch the Agent Dashboard at <a href="http://localhost:3000" target="_blank" style={{ color: '#4f46e5' }}>localhost:3000</a></li>
                    <li style={{ marginBottom: 8 }}>Approve the fix workflow</li>
                    <li>Agent disables chaos → Checkout works again!</li>
                </ol>
            </div>
        </div>
    );
}
