'use client';

import { useState, useEffect } from 'react';
import {
    Activity,
    AlertTriangle,
    CheckCircle,
    GitBranch,
    Zap,
    Shield
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
    agent: {
        status: string;
        running: boolean;
        loop_count: number;
        last_run: string | null;
    };
    signals: {
        total: number;
        unprocessed: number;
    };
    issues: {
        total: number;
        open: number;
    };
    workflows: {
        total: number;
        pending_approval: number;
        running: number;
        completed: number;
    };
}

interface Issue {
    _id: string;
    title: string;
    category: string;
    confidence: number;
    status: string;
    merchant_count: number;
    created_at: string;
}

interface Workflow {
    _id: string;
    name: string;
    status: string;
    overall_risk: string;
    created_at: string;
}

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
    const [pendingWorkflows, setPendingWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [wsConnected, setWsConnected] = useState(false);

    useEffect(() => {
        fetchData();

        let ws: WebSocket | null = null;
        try {
            ws = new WebSocket(`${WS_BASE}/ws`);

            ws.onopen = () => {
                console.log('WebSocket connected');
                setWsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    // Refresh data on any message/ping
                    const data = JSON.parse(event.data);
                    fetchData();
                } catch (e) {
                    console.error('WS parse error:', e);
                }
            };

            ws.onclose = () => {
                setWsConnected(false);
            };

            ws.onerror = () => {
                setWsConnected(false);
            };
        } catch (e) {
            console.error('WebSocket setup failed:', e);
        }

        const interval = setInterval(fetchData, 3000);

        return () => {
            clearInterval(interval);
            if (ws) ws.close();
        };
    }, []);

    async function fetchData() {
        try {
            const [statsRes, issuesRes, workflowsRes] = await Promise.all([
                fetch(`${API_BASE}/api/dashboard/stats`),
                fetch(`${API_BASE}/api/issues?limit=5`),
                fetch(`${API_BASE}/api/workflows/pending`),
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (issuesRes.ok) {
                const data = await issuesRes.json();
                setRecentIssues(data.issues || []);
            }
            if (workflowsRes.ok) {
                const data = await workflowsRes.json();
                setPendingWorkflows(data.workflows || []);
            }
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function approveWorkflow(id: string) {
        try {
            await fetch(`${API_BASE}/api/workflows/${id}/approve`, { method: 'POST' });
            fetchData();
        } catch (error) {
            console.error('Failed to approve:', error);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-t-2 border-b-2 border-indigo-500 animate-ping opacity-20"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Command <span className="premium-gradient-text">Center</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-light">
                        System Integrity & Automated Healing
                    </p>
                </div>

                <div className="glass-card px-4 py-2 rounded-full flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-amber-500'}`} />
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {wsConnected ? 'System Live' : 'Connecting...'}
                        </span>
                    </div>
                    {lastUpdate && (
                        <div className="text-xs text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-4">
                            Last sync: {lastUpdate.toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Agent Status"
                    value={stats?.agent.status || '-'}
                    icon={<Activity className="w-6 h-6 text-indigo-400" />}
                    trend="+100% uptime"
                    color="indigo"
                    glow
                />
                <StatCard
                    title="Active Signals"
                    value={stats?.signals.unprocessed || 0}
                    icon={<Zap className="w-6 h-6 text-amber-400" />}
                    trend={`${stats?.signals.total || 0} total events`}
                    color="amber"
                />
                <StatCard
                    title="Open Issues"
                    value={stats?.issues.open || 0}
                    icon={<AlertTriangle className="w-6 h-6 text-rose-400" />}
                    trend="Requires attention"
                    color="rose"
                    alert={stats?.issues.open ? stats.issues.open > 0 : false}
                />
                <StatCard
                    title="Auto-Healed"
                    value={stats?.workflows.completed || 0}
                    icon={<Shield className="w-6 h-6 text-emerald-400" />}
                    trend="94% success rate"
                    color="emerald"
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* Pending Approvals */}
                <div className="glass-card rounded-2xl p-6 min-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <GitBranch className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                Decision Required
                            </h2>
                        </div>
                        <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-full">
                            {pendingWorkflows.length} Pending
                        </span>
                    </div>

                    <div className="flex-1 space-y-4">
                        {pendingWorkflows.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-60">
                                <CheckCircle className="w-16 h-16 stroke-1" />
                                <p className="font-light">All systems optimized</p>
                            </div>
                        ) : (
                            pendingWorkflows.map((workflow) => (
                                <div key={workflow._id} className="group relative bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium text-slate-900 dark:text-slate-200">
                                                {workflow.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Badge label={workflow.overall_risk} type={workflow.overall_risk as any} />
                                                <span className="text-xs text-slate-500 font-mono">
                                                    ID: {workflow._id.slice(-6)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => approveWorkflow(workflow._id)}
                                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-card rounded-2xl p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-500/10 rounded-lg">
                                <Activity className="w-5 h-5 text-rose-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                Live Feed
                            </h2>
                        </div>
                        <Link href="/issues" className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">
                            View all history →
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {recentIssues.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 opacity-60">
                                <Shield className="w-12 h-12 mx-auto mb-3 stroke-1" />
                                <p className="font-light">No anomalous signals detected</p>
                            </div>
                        ) : (
                            recentIssues.map((issue) => (
                                <Link
                                    key={issue._id}
                                    href={`/issues/${issue._id}`}
                                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                                >
                                    <div className={`w-2 h-2 rounded-full mt-1 ${issue.confidence > 0.8 ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-amber-500'
                                        }`} />

                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-white transition-colors">
                                            {issue.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-slate-500">
                                                {issue.merchant_count} impacted
                                            </span>
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                {issue.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                                            {Math.round(issue.confidence * 100)}%
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                                            Confidence
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, color, glow, alert }: any) {
    return (
        <div className={`glass-card p-6 rounded-2xl relative overflow-hidden group ${alert ? 'border-rose-500/50 shadow-rose-500/10' : ''}`}>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {title}
                    </p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {value}
                    </h3>
                </div>
                <div className={`p-3 rounded-xl bg-${color}-500/10 ${glow ? 'shadow-[0_0_15px_rgba(99,102,241,0.3)]' : ''}`}>
                    {icon}
                </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                <span className="bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-slate-500 dark:text-slate-300">
                    {trend}
                </span>
            </div>
            {/* Hover Gradient */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 bg-${color}-500/20 rounded-full blur-2xl group-hover:bg-${color}-500/30 transition-all duration-500`} />
        </div>
    );
}

function Badge({ label, type }: { label: string, type: 'critical' | 'high' | 'medium' | 'low' }) {
    const styles = {
        critical: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };

    return (
        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide border ${styles[type] || styles.low}`}>
            {label}
        </span>
    );
}
