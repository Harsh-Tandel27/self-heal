'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    Play,
    Pause,
    RotateCcw,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';
import EvidenceGallery from '@/components/EvidenceGallery';

interface WorkflowStep {
    id: number;
    name: string;
    action_type: string;
    description: string;
    status: string;
    risk_level: string;
    requires_approval: boolean;
    result: any;
    error: string | null;
}

interface Workflow {
    _id: string;
    name: string;
    description: string;
    status: string;
    overall_risk: string;
    issue_id: string;
    steps: WorkflowStep[];
    current_step: number;
    created_at: string;
    completed_at: string | null;
    approvals: any[];
    rejections: any[];
}

const API_BASE = 'http://localhost:8000';

export default function WorkflowDetailPage() {
    const params = useParams();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkflow();
        const interval = setInterval(fetchWorkflow, 3000);
        return () => clearInterval(interval);
    }, [params.id]);

    async function fetchWorkflow() {
        try {
            const res = await fetch(`${API_BASE}/api/workflows/${params.id}`);
            if (res.ok) {
                setWorkflow(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch workflow:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove() {
        await fetch(`${API_BASE}/api/workflows/${params.id}/approve`, { method: 'POST' });
        fetchWorkflow();
    }

    async function handleReject() {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            await fetch(`${API_BASE}/api/workflows/${params.id}/reject?reason=${encodeURIComponent(reason)}`, { method: 'POST' });
            fetchWorkflow();
        }
    }

    async function handlePause() {
        await fetch(`${API_BASE}/api/workflows/${params.id}/pause`, { method: 'POST' });
        fetchWorkflow();
    }

    async function handleResume() {
        await fetch(`${API_BASE}/api/workflows/${params.id}/resume`, { method: 'POST' });
        fetchWorkflow();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="text-center py-16">
                <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-medium text-slate-700">Workflow not found</h3>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back Button */}
            <Link
                href="/workflows"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Workflows
            </Link>

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {workflow.name}
                            </h1>
                            <StatusBadge status={workflow.status} />
                            <RiskBadge risk={workflow.overall_risk} />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            {workflow.description}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        {workflow.status === 'pending_approval' && (
                            <>
                                <button
                                    onClick={handleApprove}
                                    className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Reject
                                </button>
                            </>
                        )}
                        {workflow.status === 'running' && (
                            <button
                                onClick={handlePause}
                                className="flex items-center gap-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                            >
                                <Pause className="w-4 h-4" />
                                Pause
                            </button>
                        )}
                        {workflow.status === 'paused' && (
                            <button
                                onClick={handleResume}
                                className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            >
                                <Play className="w-4 h-4" />
                                Resume
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                        <span>Progress</span>
                        <span>
                            {workflow.steps.filter(s => s.status === 'completed').length}/{workflow.steps.length} steps completed
                        </span>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${workflow.status === 'failed' ? 'bg-red-500' :
                                workflow.status === 'completed' ? 'bg-green-500' : 'bg-primary-500'
                                }`}
                            style={{
                                width: `${(workflow.steps.filter(s => s.status === 'completed').length / Math.max(workflow.steps.length, 1)) * 100}%`
                            }}
                        />
                    </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Created</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-1">
                            {new Date(workflow.created_at).toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Completed</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-1">
                            {workflow.completed_at ? new Date(workflow.completed_at).toLocaleString() : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Approvals</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-1">
                            {workflow.approvals.length}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Related Issue</p>
                        <Link
                            href={`/issues/${workflow.issue_id}`}
                            className="font-medium text-primary-600 hover:text-primary-700 mt-1 block"
                        >
                            View Issue →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Steps */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                    Workflow Steps
                </h2>

                <div className="space-y-4">
                    {workflow.steps.map((step, index) => (
                        <div
                            key={step.id}
                            className={`
                relative pl-10 pb-6 
                ${index < workflow.steps.length - 1 ? 'border-l-2 border-slate-200 dark:border-slate-700 ml-4' : 'ml-4'}
              `}
                        >
                            {/* Step indicator */}
                            <div className={`
                absolute left-0 top-0 transform -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center
                ${step.status === 'completed' ? 'bg-green-100 text-green-600' :
                                    step.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                                        step.status === 'failed' ? 'bg-red-100 text-red-600' :
                                            'bg-slate-100 text-slate-400'
                                }
              `}>
                                {step.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                                    step.status === 'running' ? <Play className="w-5 h-5" /> :
                                        step.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                                            <span className="text-sm font-bold">{step.id}</span>
                                }
                            </div>

                            {/* Step content */}
                            <div className={`
                ml-4 p-4 rounded-lg border
                ${step.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                                    step.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                                        step.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                            'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                                }
              `}>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">
                                        {step.name}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <StepRiskBadge risk={step.risk_level} />
                                        {step.requires_approval && (
                                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                                                Requires Approval
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                                    {step.description}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Action: <code className="bg-slate-200 dark:bg-slate-600 px-1 rounded">{step.action_type}</code>
                                </p>

                                {step.error && (
                                    <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-sm text-red-700 dark:text-red-400">
                                        Error: {step.error}
                                    </div>
                                )}

                                {step.result && (
                                    <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-sm text-green-700 dark:text-green-400">
                                        Result: {JSON.stringify(step.result)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Visual Evidence Gallery */}
            <EvidenceGallery steps={workflow.steps} />

            {/* Approvals History */}
            {
                (workflow.approvals.length > 0 || workflow.rejections.length > 0) && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Approval History
                        </h2>
                        <div className="space-y-3">
                            {workflow.approvals.map((approval, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-slate-700 dark:text-slate-300">
                                        Approved by <strong>{approval.user}</strong>
                                    </span>
                                    <span className="text-slate-500">
                                        {new Date(approval.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            {workflow.rejections.map((rejection, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-slate-700 dark:text-slate-300">
                                        Rejected by <strong>{rejection.user}</strong>: {rejection.reason}
                                    </span>
                                    <span className="text-slate-500">
                                        {new Date(rejection.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        draft: 'bg-gray-100 text-gray-700',
        pending_approval: 'bg-yellow-100 text-yellow-700',
        approved: 'bg-blue-100 text-blue-700',
        running: 'bg-purple-100 text-purple-700',
        paused: 'bg-orange-100 text-orange-700',
        completed: 'bg-green-100 text-green-700',
        failed: 'bg-red-100 text-red-700',
        rolled_back: 'bg-gray-100 text-gray-700',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
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
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[risk] || colors.low}`}>
            {risk} risk
        </span>
    );
}

function StepRiskBadge({ risk }: { risk: string }) {
    const colors: Record<string, string> = {
        low: 'text-green-600',
        medium: 'text-yellow-600',
        high: 'text-orange-600',
        critical: 'text-red-600',
    };

    return (
        <span className={`text-xs font-medium ${colors[risk] || colors.low}`}>
            {risk}
        </span>
    );
}
