'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Brain,
    CheckCircle,
    AlertTriangle,
    Users,
    Clock,
    GitBranch
} from 'lucide-react';

interface ReasoningStep {
    step_number: number;
    observation: string;
    inference: string;
    confidence: number;
}

interface Issue {
    _id: string;
    title: string;
    summary: string;
    category: string;
    subcategory: string | null;
    confidence: number;
    status: string;
    root_cause: string;
    reasoning_chain: ReasoningStep[];
    affected_merchants: string[];
    merchant_count: number;
    estimated_impact: string;
    created_at: string;
    workflow_id: string | null;
    proposed_actions: string[];
    signal_ids: string[];
}

const API_BASE = 'http://localhost:8000';

export default function IssueDetailPage() {
    const params = useParams();
    const [issue, setIssue] = useState<Issue | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchIssue();
    }, [params.id]);

    async function fetchIssue() {
        try {
            const res = await fetch(`${API_BASE}/api/issues/${params.id}`);
            if (res.ok) {
                setIssue(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch issue:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    if (!issue) {
        return (
            <div className="text-center py-16">
                <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-medium text-slate-700">Issue not found</h3>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Back Button */}
            <Link
                href="/issues"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Issues
            </Link>

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {issue.title}
                            </h1>
                            <StatusBadge status={issue.status} />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            {issue.summary}
                        </p>
                    </div>
                    <ConfidenceDisplay confidence={issue.confidence} />
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Category</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-1 capitalize">
                            {issue.category.replace('_', ' ')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Impact</p>
                        <p className={`font-medium mt-1 capitalize ${issue.estimated_impact === 'critical' ? 'text-red-600' :
                                issue.estimated_impact === 'high' ? 'text-orange-600' :
                                    issue.estimated_impact === 'medium' ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {issue.estimated_impact}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Merchants</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-1">
                            {issue.merchant_count}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Detected</p>
                        <p className="font-medium text-slate-900 dark:text-white mt-1">
                            {new Date(issue.created_at).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Root Cause */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Root Cause Analysis
                    </h2>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {issue.root_cause}
                    </p>
                </div>

                {/* Affected Merchants */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Affected Merchants
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {issue.affected_merchants.map((merchant, i) => (
                            <span
                                key={i}
                                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-sm text-slate-700 dark:text-slate-300"
                            >
                                {merchant}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Reasoning Chain - Explainability */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-500" />
                    AI Reasoning Chain
                    <span className="text-xs font-normal text-slate-500 ml-2">
                        (Gemini Analysis)
                    </span>
                </h2>

                <div className="space-y-4">
                    {issue.reasoning_chain.length > 0 ? (
                        issue.reasoning_chain.map((step, index) => (
                            <div
                                key={index}
                                className="relative pl-8 pb-4 border-l-2 border-purple-200 dark:border-purple-800 last:border-l-transparent"
                            >
                                <div className="absolute left-0 top-0 transform -translate-x-1/2 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                        {step.step_number}
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                                            Observation
                                        </p>
                                        <span className="text-xs text-slate-500">
                                            Confidence: {Math.round(step.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">
                                        {step.observation}
                                    </p>
                                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                                        Inference
                                    </p>
                                    <p className="text-slate-700 dark:text-slate-300 text-sm">
                                        {step.inference}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500 text-center py-4">
                            No detailed reasoning chain available
                        </p>
                    )}
                </div>
            </div>

            {/* Proposed Actions */}
            {issue.proposed_actions.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-green-500" />
                        Proposed Actions
                    </h2>
                    <ul className="space-y-2">
                        {issue.proposed_actions.map((action, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <span className="text-slate-700 dark:text-slate-300">{action}</span>
                            </li>
                        ))}
                    </ul>
                    {issue.workflow_id && (
                        <Link
                            href={`/workflows/${issue.workflow_id}`}
                            className="inline-flex items-center gap-2 mt-4 text-primary-600 hover:text-primary-700"
                        >
                            View Workflow →
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        detected: 'bg-blue-100 text-blue-700',
        analyzing: 'bg-purple-100 text-purple-700',
        pending_action: 'bg-yellow-100 text-yellow-700',
        in_progress: 'bg-orange-100 text-orange-700',
        resolved: 'bg-green-100 text-green-700',
        escalated: 'bg-red-100 text-red-700',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
            {status.replace('_', ' ')}
        </span>
    );
}

function ConfidenceDisplay({ confidence }: { confidence: number }) {
    const percent = Math.round(confidence * 100);

    let color = 'text-green-500';
    let bgColor = 'bg-green-100';
    if (percent < 70) { color = 'text-yellow-500'; bgColor = 'bg-yellow-100'; }
    if (percent < 50) { color = 'text-red-500'; bgColor = 'bg-red-100'; }

    return (
        <div className={`${bgColor} dark:bg-opacity-20 rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${color}`}>{percent}%</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Confidence</p>
        </div>
    );
}
