'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Square,
    Zap,
    ChevronDown,
    ChevronUp,
    Activity,
    AlertTriangle,
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

interface Scenario {
    id: string;
    name: string;
    description: string;
    duration: string;
}

interface ScenarioStatus {
    status: 'not_running' | 'running' | 'stopping' | 'completed';
    events_generated?: number;
}

export default function SandboxWidget() {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<Record<string, ScenarioStatus>>({});
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchScenarios = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/scenarios/`);
            if (res.ok) {
                const data = await res.json();
                setScenarios(data.available || []);
                setActiveScenarios(data.active || []);

                // Fetch statuses
                const statusMap: Record<string, ScenarioStatus> = {};
                for (const s of data.available) {
                    const statusRes = await fetch(`${API_BASE}/scenarios/status/${s.id}`);
                    if (statusRes.ok) {
                        statusMap[s.id] = await statusRes.json();
                    }
                }
                setStatuses(statusMap);
            }
        } catch (e) {
            console.error('Failed to fetch scenarios:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScenarios();
        const interval = setInterval(fetchScenarios, 5000);
        return () => clearInterval(interval);
    }, [fetchScenarios]);

    const startScenario = async (id: string) => {
        try {
            await fetch(`${API_BASE}/scenarios/start/${id}`, { method: 'POST' });
            fetchScenarios();
        } catch (e) {
            console.error('Failed to start:', e);
        }
    };

    const stopScenario = async (id: string) => {
        try {
            await fetch(`${API_BASE}/scenarios/stop/${id}`, { method: 'POST' });
            fetchScenarios();
        } catch (e) {
            console.error('Failed to stop:', e);
        }
    };

    const stopAll = async () => {
        try {
            await fetch(`${API_BASE}/scenarios/stop-all`, { method: 'POST' });
            // Immediate refresh
            fetchScenarios();
        } catch (e) {
            console.error('Failed to stop all:', e);
        }
    };

    const getIcon = (id: string) => {
        const icons: Record<string, string> = {
            migration_chaos: '🔄',
            checkout_storm: '💳',
            webhook_cascade: '📡',
            api_degradation: '📉',
            config_drift: '⚙️',
        };
        return icons[id] || '⚡';
    };

    const totalEvents = Object.values(statuses).reduce(
        (sum, s) => sum + (s.events_generated || 0), 0
    );

    return (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary-500/20 rounded-lg">
                        <Zap className="w-4 h-4 text-primary-400" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium text-white">Chaos Sandbox</div>
                        <div className="text-xs text-slate-400">
                            {activeScenarios.length > 0
                                ? `${activeScenarios.length} running • ${totalEvents} events`
                                : 'No active scenarios'
                            }
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {activeScenarios.length > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                            <Activity className="w-3 h-3 animate-pulse" />
                            Active
                        </span>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-700"
                    >
                        <div className="p-3 space-y-2">
                            {/* Quick Actions */}
                            <div className="grid grid-cols-2 gap-2">
                                {scenarios.slice(0, 4).map((scenario) => {
                                    const isRunning = statuses[scenario.id]?.status === 'running';
                                    return (
                                        <button
                                            key={scenario.id}
                                            onClick={() => isRunning ? stopScenario(scenario.id) : startScenario(scenario.id)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isRunning
                                                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                                                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                                                }`}
                                        >
                                            <span>{getIcon(scenario.id)}</span>
                                            <span className="truncate">{scenario.name.split(' ')[0]}</span>
                                            {isRunning ? (
                                                <Square className="w-3 h-3 ml-auto" />
                                            ) : (
                                                <Play className="w-3 h-3 ml-auto" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Stop All */}
                            {activeScenarios.length > 0 && (
                                <button
                                    onClick={stopAll}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <Square className="w-3 h-3" />
                                    Stop All Scenarios
                                </button>
                            )}

                            {/* Link to full sandbox */}
                            <a
                                href="/sandbox"
                                className="block text-center text-xs text-primary-400 hover:text-primary-300 pt-1"
                            >
                                Open Full Sandbox →
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
