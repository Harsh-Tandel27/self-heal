'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Zap,
    Shield,
    Activity,
    Play,
    Square,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ArrowRight,
} from 'lucide-react';
import VapiButton from '@/components/VapiButton';
import TerminalModal from '@/components/TerminalModal';

const API_BASE = 'http://localhost:8000';

interface Scenario {
    id: string;
    name: string;
    description: string;
    duration: string;
}

interface ScenarioStatus {
    started_at?: string;
    status: 'not_running' | 'running' | 'stopping' | 'completed';
    events_generated?: number;
}

interface ApiScenario extends Scenario {
    status: ScenarioStatus;
    isRunning: boolean;
}

export default function SandboxPage() {
    const [scenarios, setScenarios] = useState<ApiScenario[]>([]);
    const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedScenario, setSelectedScenario] = useState<ApiScenario | null>(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [stats, setStats] = useState({ signals: 0, issues: 0, workflows: 0 });

    // Fetch scenarios from backend
    const fetchScenarios = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/scenarios/`);
            if (res.ok) {
                const data = await res.json();

                // Fetch status for each scenario
                const scenariosWithStatus = await Promise.all(
                    data.available.map(async (s: Scenario) => {
                        const statusRes = await fetch(`${API_BASE}/scenarios/status/${s.id}`);
                        const status = statusRes.ok ? await statusRes.json() : { status: 'not_running' };
                        return {
                            ...s,
                            status,
                            isRunning: status.status === 'running',
                        };
                    })
                );

                setScenarios(scenariosWithStatus);
                setActiveScenarios(data.active || []);
            }
        } catch (e) {
            console.error('Failed to fetch scenarios:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch dashboard stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/dashboard/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats({
                    signals: data.signals?.total || 0,
                    issues: data.issues?.total || 0,
                    workflows: data.workflows?.total || 0,
                });
            }
        } catch (e) {
            console.error('Failed to fetch stats:', e);
        }
    }, []);

    useEffect(() => {
        fetchScenarios();
        fetchStats();

        // Poll for updates
        const interval = setInterval(() => {
            fetchScenarios();
            fetchStats();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchScenarios, fetchStats]);

    // Start scenario
    const startScenario = async (scenarioId: string) => {
        const scenario = scenarios.find(s => s.id === scenarioId);
        if (scenario) {
            setSelectedScenario(scenario);
            setIsTerminalOpen(true);
        }

        try {
            const res = await fetch(`${API_BASE}/scenarios/start/${scenarioId}`, {
                method: 'POST',
            });
            if (res.ok) {
                fetchScenarios();
            }
        } catch (e) {
            console.error('Failed to start scenario:', e);
        }
    };

    // Stop scenario
    const stopScenario = async (scenarioId: string) => {
        try {
            const res = await fetch(`${API_BASE}/scenarios/stop/${scenarioId}`, {
                method: 'POST',
            });
            if (res.ok) {
                fetchScenarios();
            }
        } catch (e) {
            console.error('Failed to stop scenario:', e);
        }
    };

    // Voice command handler
    const handleVoiceCommand = async (command: string) => {
        console.log('Voice command:', command);
        if (command.includes('migration')) {
            startScenario('migration_chaos');
        } else if (command.includes('checkout')) {
            startScenario('checkout_storm');
        } else if (command.includes('webhook')) {
            startScenario('webhook_cascade');
        } else if (command.includes('stop')) {
            await fetch(`${API_BASE}/scenarios/stop-all`, { method: 'POST' });
            fetchScenarios();
        }
    };

    const stopAllScenarios = async () => {
        await fetch(`${API_BASE}/scenarios/stop-all`, { method: 'POST' });
        fetchScenarios();
    };

    const handleTerminalComplete = () => {
        // Terminal animation finished
    };

    const getScenarioIcon = (id: string) => {
        const icons: Record<string, string> = {
            migration_chaos: '🔄',
            checkout_storm: '💳',
            webhook_cascade: '📡',
            api_degradation: '📉',
            config_drift: '⚙️',
        };
        return icons[id] || '⚡';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
                <div className="container mx-auto px-6 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Bot className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">NexusAgent Sandbox</h1>
                                <p className="text-primary-200">Backend-Connected Simulation Environment</p>
                            </div>
                        </div>

                        <p className="text-primary-100 max-w-2xl">
                            Start real chaos scenarios that generate signals to the agent.
                            Watch the agent detect, analyze, and respond in real-time.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Live Stats Bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-8">
                            <StatItem
                                icon={<Activity className="w-5 h-5" />}
                                label="Active Scenarios"
                                value={activeScenarios.length.toString()}
                                status={activeScenarios.length > 0 ? 'warning' : 'success'}
                            />
                            <StatItem
                                icon={<Zap className="w-5 h-5" />}
                                label="Total Signals"
                                value={stats.signals.toString()}
                            />
                            <StatItem
                                icon={<AlertCircle className="w-5 h-5" />}
                                label="Issues Created"
                                value={stats.issues.toString()}
                            />
                            <StatItem
                                icon={<Shield className="w-5 h-5" />}
                                label="Workflows"
                                value={stats.workflows.toString()}
                            />
                        </div>

                        <button
                            onClick={() => { fetchScenarios(); fetchStats(); }}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Scenarios List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    Chaos Scenarios
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Start scenarios to generate real signals and test agent responses
                                </p>
                            </div>

                            {loading ? (
                                <div className="p-8 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" />
                                    <p className="text-sm text-slate-500 mt-2">Loading scenarios...</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    <AnimatePresence>
                                        {scenarios.map((scenario) => (
                                            <motion.div
                                                key={scenario.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors ${scenario.isRunning ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Icon */}
                                                    <div className="text-3xl">{getScenarioIcon(scenario.id)}</div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                                {scenario.name}
                                                            </h3>
                                                            {scenario.isRunning && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                                                    Running
                                                                </span>
                                                            )}
                                                            {scenario.status.status === 'completed' && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Completed
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                                            {scenario.description}
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {scenario.duration}
                                                            </span>
                                                            {scenario.status.events_generated && (
                                                                <span className="flex items-center gap-1">
                                                                    <Zap className="w-3 h-3" />
                                                                    {scenario.status.events_generated} events
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex-shrink-0">
                                                        {scenario.isRunning ? (
                                                            <button
                                                                onClick={() => stopScenario(scenario.id)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Square className="w-4 h-4" />
                                                                Stop
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => startScenario(scenario.id)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                                Start
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                                Quick Actions
                            </h3>

                            <div className="space-y-2">
                                <button
                                    onClick={() => startScenario('checkout_storm')}
                                    disabled={activeScenarios.includes('checkout_storm')}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <span className="flex items-center gap-2">
                                        <span>💳</span>
                                        <span className="text-sm font-medium">Start Checkout Storm</span>
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                </button>

                                <button
                                    onClick={() => startScenario('webhook_cascade')}
                                    disabled={activeScenarios.includes('webhook_cascade')}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-750 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <span className="flex items-center gap-2">
                                        <span>📡</span>
                                        <span className="text-sm font-medium">Start Webhook Cascade</span>
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                </button>

                                {activeScenarios.length > 0 && (
                                    <button
                                        onClick={stopAllScenarios}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors mt-4"
                                    >
                                        <Square className="w-4 h-4" />
                                        <span className="text-sm font-medium">Stop All Scenarios</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Voice Commands */}
                        <div className="bg-slate-900 rounded-xl p-6 text-white">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                Voice Commands
                            </h3>

                            <div className="space-y-2 text-sm">
                                <VoiceExample command="Start migration chaos" />
                                <VoiceExample command="Start checkout storm" />
                                <VoiceExample command="Start webhook cascade" />
                                <VoiceExample command="Stop all scenarios" />
                            </div>

                            <p className="text-xs text-slate-400 mt-4">
                                Click the mic to try voice commands
                            </p>
                        </div>

                        {/* Agent Dashboard Link */}
                        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                            <h3 className="font-semibold mb-2">View Agent Response</h3>
                            <p className="text-primary-100 text-sm mb-4">
                                See how the agent detects and responds to the chaos you&apos;re creating.
                            </p>
                            <a
                                href="/"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                            >
                                Open Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Voice Button */}
            <VapiButton onVoiceCommand={handleVoiceCommand} />

            {/* Terminal Modal */}
            {selectedScenario && (
                <TerminalModal
                    isOpen={isTerminalOpen}
                    onClose={() => setIsTerminalOpen(false)}
                    scenario={{
                        id: selectedScenario.id,
                        name: selectedScenario.name,
                        fix: `Starting ${selectedScenario.name} - generating events...`,
                    }}
                    onComplete={handleTerminalComplete}
                />
            )}
        </div>
    );
}

function StatItem({
    icon,
    label,
    value,
    status
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    status?: 'success' | 'warning' | 'error';
}) {
    const statusColors = {
        success: 'text-green-600',
        warning: 'text-yellow-600',
        error: 'text-red-600',
    };

    return (
        <div className="flex items-center gap-3">
            <div className="text-slate-400">{icon}</div>
            <div>
                <div className="text-xs text-slate-500">{label}</div>
                <div className={`font-semibold ${status ? statusColors[status] : 'text-slate-900 dark:text-white'}`}>
                    {value}
                </div>
            </div>
        </div>
    );
}

function VoiceExample({ command }: { command: string }) {
    return (
        <div className="flex items-center gap-2 text-slate-300">
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <span>&ldquo;{command}&rdquo;</span>
        </div>
    );
}
