'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    GitBranch,
    CheckCircle,
    XCircle,
    Clock,
    Play,
    Pause,
    RotateCcw,
    Filter
} from 'lucide-react';

interface Workflow {
    _id: string;
    name: string;
    description: string;
    status: string;
    overall_risk: string;
    issue_id: string;
    steps: any[];
    current_step: number;
    created_at: string;
    approvals: any[];
}

const API_BASE = 'http://localhost:8000';

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchWorkflows();
    }, [statusFilter]);

    async function fetchWorkflows() {
        setLoading(true);
        try {
            const params = statusFilter ? `?status=${statusFilter}` : '';
            const res = await fetch(`${API_BASE}/api/workflows${params}`);
            if (res.ok) {
                const data = await res.json();
                setWorkflows(data.workflows || []);
            }
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id: string) {
        try {
            await fetch(`${API_BASE}/api/workflows/${id}/approve`, { method: 'POST' });
            fetchWorkflows();
        } catch (error) {
            console.error('Failed to approve:', error);
        }
    }

    async function handleReject(id: string) {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            try {
                await fetch(`${API_BASE}/api/workflows/${id}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
                fetchWorkflows();
            } catch (error) {
                console.error('Failed to reject:', error);
            }
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Workflows
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Remediation workflows and their execution status
                </p>
            </div>

            {/* Filter */}
            <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Status:</span>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                    <option value="">All</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {/* Workflows List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
            ) : workflows.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <GitBranch className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">No workflows found</h3>
                    <p className="text-slate-500 mt-2">Workflows will appear here when issues are detected</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {workflows.map((workflow) => (
                        <div
                            key={workflow._id}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 card-hover"
                        >
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {workflow.name}
                                        </h3>
                                        <WorkflowStatusBadge status={workflow.status} />
                                        <RiskBadge risk={workflow.overall_risk} />
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        {workflow.description}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {workflow.status === 'pending_approval' && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(workflow._id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(workflow._id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    <Link
                                        href={`/workflows/${workflow._id}`}
                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg transition-colors"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>

                            {/* Steps Progress */}
                            <div className="mt-4">
                                <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                                    <span>Steps: {workflow.steps.length}</span>
                                    <span>
                                        {workflow.current_step}/{workflow.steps.length} completed
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 transition-all duration-500"
                                        style={{
                                            width: `${(workflow.current_step / Math.max(workflow.steps.length, 1)) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {new Date(workflow.created_at).toLocaleString()}
                                </span>
                                {workflow.approvals.length > 0 && (
                                    <span>
                                        {workflow.approvals.length} approval(s)
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function WorkflowStatusBadge({ status }: { status: string }) {
    const config: Record<string, { color: string; icon: any }> = {
        draft: { color: 'bg-gray-100 text-gray-700', icon: null },
        pending_approval: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
        approved: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
        running: { color: 'bg-purple-100 text-purple-700', icon: Play },
        paused: { color: 'bg-orange-100 text-orange-700', icon: Pause },
        completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
        failed: { color: 'bg-red-100 text-red-700', icon: XCircle },
        rolled_back: { color: 'bg-gray-100 text-gray-700', icon: RotateCcw },
    };

    const { color, icon: Icon } = config[status] || config.draft;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {Icon && <Icon className="w-3 h-3" />}
            {status.replace('_', ' ')}
        </span>
    );
}

function RiskBadge({ risk }: { risk: string }) {
    const colors: Record<string, string> = {
        low: 'bg-green-100 text-green-700',
        medium: 'bg-yellow-100 text-yellow-700',
        high: 'bg-orange-100 text-orange-700',
        critical: 'bg-red-100 text-red-700',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[risk] || colors.low}`}>
            {risk} risk
        </span>
    );
}
