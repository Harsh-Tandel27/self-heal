'use client';

import { useState, useEffect } from 'react';
import {
    Database,
    Play,
    Square,
    Zap,
    AlertTriangle,
    Webhook,
    ShoppingCart,
    Ticket,
    RefreshCw
} from 'lucide-react';

interface Scenario {
    id: string;
    name: string;
    description: string;
    duration: string;
}

interface ScenarioStatus {
    started_at?: string;
    status: string;
    events_generated: number;
}

const API_BASE = 'http://localhost:8000';

const errorTriggers = [
    { id: 'checkout-failure', name: 'Checkout Failure', icon: ShoppingCart, color: 'red' },
    { id: 'api-misconfiguration', name: 'API Error', icon: AlertTriangle, color: 'orange' },
    { id: 'webhook-failure', name: 'Webhook Failure', icon: Webhook, color: 'yellow' },
    { id: 'migration-issue', name: 'Migration Issue', icon: Database, color: 'purple' },
    { id: 'support-ticket', name: 'Support Ticket', icon: Ticket, color: 'blue' },
];

export default function DataControlPage() {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
    const [scenarioStatuses, setScenarioStatuses] = useState<Record<string, ScenarioStatus>>({});
    const [triggering, setTriggering] = useState<string | null>(null);

    useEffect(() => {
        fetchScenarios();
        const interval = setInterval(fetchScenarios, 3000);
        return () => clearInterval(interval);
    }, []);

    async function fetchScenarios() {
        try {
            const res = await fetch(`${API_BASE}/scenarios/`);
            if (res.ok) {
                const data = await res.json();
                setScenarios(data.available || []);
                setActiveScenarios(data.active || []);

                // Fetch status for active scenarios
                for (const id of data.active || []) {
                    const statusRes = await fetch(`${API_BASE}/scenarios/status/${id}`);
                    if (statusRes.ok) {
                        const status = await statusRes.json();
                        setScenarioStatuses(prev => ({ ...prev, [id]: status }));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch scenarios:', error);
        }
    }

    async function startScenario(id: string) {
        try {
            await fetch(`${API_BASE}/scenarios/start/${id}`, { method: 'POST' });
            fetchScenarios();
        } catch (error) {
            console.error('Failed to start scenario:', error);
        }
    }

    async function stopScenario(id: string) {
        try {
            await fetch(`${API_BASE}/scenarios/stop/${id}`, { method: 'POST' });
            fetchScenarios();
        } catch (error) {
            console.error('Failed to stop scenario:', error);
        }
    }

    async function triggerError(type: string) {
        setTriggering(type);
        try {
            await fetch(`${API_BASE}/trigger/${type}`, { method: 'POST' });
        } catch (error) {
            console.error('Failed to trigger error:', error);
        } finally {
            setTimeout(() => setTriggering(null), 500);
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Data Control Panel
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Generate real error data and run test scenarios
                </p>
            </div>

            {/* Quick Triggers */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Error Triggers
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Click to instantly generate a specific error type for testing
                </p>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {errorTriggers.map((trigger) => {
                        const Icon = trigger.icon;
                        const isTriggering = triggering === trigger.id;

                        return (
                            <button
                                key={trigger.id}
                                onClick={() => triggerError(trigger.id)}
                                disabled={isTriggering}
                                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed
                  transition-all hover:scale-105 hover:shadow-lg
                  ${isTriggering
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-slate-200 dark:border-slate-600 hover:border-primary-400'
                                    }
                `}
                            >
                                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${trigger.color === 'red' ? 'bg-red-100 text-red-600' :
                                        trigger.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                            trigger.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                                                trigger.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                                    'bg-blue-100 text-blue-600'
                                    }
                `}>
                                    {isTriggering ? (
                                        <RefreshCw className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <Icon className="w-6 h-6" />
                                    )}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {trigger.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Scenarios */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-500" />
                    Multi-Step Scenarios
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Run realistic multi-step error scenarios that simulate real-world situations
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scenarios.map((scenario) => {
                        const isActive = activeScenarios.includes(scenario.id);
                        const status = scenarioStatuses[scenario.id];

                        return (
                            <div
                                key={scenario.id}
                                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${isActive
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'border-slate-200 dark:border-slate-600'
                                    }
                `}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">
                                            {scenario.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                            {scenario.description}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Duration: {scenario.duration}
                                        </p>

                                        {isActive && status && (
                                            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                                <p className="text-sm text-green-700 dark:text-green-400">
                                                    Status: {status.status}
                                                </p>
                                                <p className="text-sm text-green-600 dark:text-green-500">
                                                    Events generated: {status.events_generated}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => isActive ? stopScenario(scenario.id) : startScenario(scenario.id)}
                                        className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                : 'bg-green-500 hover:bg-green-600 text-white'
                                            }
                    `}
                                    >
                                        {isActive ? (
                                            <>
                                                <Square className="w-4 h-4" />
                                                Stop
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                Start
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
