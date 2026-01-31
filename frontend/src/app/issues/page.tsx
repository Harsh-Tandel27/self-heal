'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Filter, RefreshCw } from 'lucide-react';

interface Issue {
    _id: string;
    title: string;
    summary: string;
    category: string;
    confidence: number;
    status: string;
    merchant_count: number;
    estimated_impact: string;
    created_at: string;
    root_cause: string;
}

const API_BASE = 'http://localhost:8000';

export default function IssuesPage() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', category: '' });

    useEffect(() => {
        fetchIssues();
    }, [filter]);

    async function fetchIssues() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter.status) params.set('status', filter.status);
            if (filter.category) params.set('category', filter.category);

            const res = await fetch(`${API_BASE}/api/issues?${params}`);
            if (res.ok) {
                const data = await res.json();
                setIssues(data.issues || []);
            }
        } catch (error) {
            console.error('Failed to fetch issues:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Issues
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Detected issues and their analysis
                    </p>
                </div>
                <button
                    onClick={fetchIssues}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Filters:</span>
                </div>
                <select
                    value={filter.status}
                    onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                    <option value="">All Statuses</option>
                    <option value="detected">Detected</option>
                    <option value="analyzing">Analyzing</option>
                    <option value="pending_action">Pending Action</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                </select>
                <select
                    value={filter.category}
                    onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                    <option value="">All Categories</option>
                    <option value="migration">Migration</option>
                    <option value="platform_bug">Platform Bug</option>
                    <option value="documentation_gap">Documentation Gap</option>
                    <option value="merchant_config">Merchant Config</option>
                </select>
            </div>

            {/* Issues List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
            ) : issues.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">No issues found</h3>
                    <p className="text-slate-500 mt-2">No issues match the current filters</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {issues.map((issue) => (
                        <Link
                            key={issue._id}
                            href={`/issues/${issue._id}`}
                            className="block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 card-hover"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {issue.title}
                                        </h3>
                                        <StatusBadge status={issue.status} />
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                        {issue.summary}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <CategoryBadge category={issue.category} />
                                        <ImpactBadge impact={issue.estimated_impact} />
                                        <span className="text-slate-500">
                                            {issue.merchant_count} merchant(s) affected
                                        </span>
                                        <span className="text-slate-500">
                                            {new Date(issue.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <ConfidenceRing confidence={issue.confidence} />
                                </div>
                            </div>
                        </Link>
                    ))}
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
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
            {status.replace('_', ' ')}
        </span>
    );
}

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        migration: 'bg-purple-100 text-purple-700',
        platform_bug: 'bg-red-100 text-red-700',
        documentation_gap: 'bg-blue-100 text-blue-700',
        merchant_config: 'bg-orange-100 text-orange-700',
    };

    const labels: Record<string, string> = {
        migration: 'Migration',
        platform_bug: 'Platform Bug',
        documentation_gap: 'Docs Gap',
        merchant_config: 'Config',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[category] || 'bg-gray-100 text-gray-700'}`}>
            {labels[category] || category}
        </span>
    );
}

function ImpactBadge({ impact }: { impact: string }) {
    const colors: Record<string, string> = {
        low: 'text-green-600',
        medium: 'text-yellow-600',
        high: 'text-orange-600',
        critical: 'text-red-600',
    };

    return (
        <span className={`text-xs font-medium ${colors[impact] || 'text-gray-600'}`}>
            {impact} impact
        </span>
    );
}

function ConfidenceRing({ confidence }: { confidence: number }) {
    const percent = Math.round(confidence * 100);
    const circumference = 2 * Math.PI * 20;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;

    let color = '#22c55e';
    if (percent < 70) color = '#f59e0b';
    if (percent < 50) color = '#ef4444';

    return (
        <div className="relative w-14 h-14">
            <svg className="w-14 h-14 transform -rotate-90">
                <circle
                    cx="28"
                    cy="28"
                    r="20"
                    stroke="#e2e8f0"
                    strokeWidth="4"
                    fill="none"
                />
                <circle
                    cx="28"
                    cy="28"
                    r="20"
                    stroke={color}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold" style={{ color }}>{percent}%</span>
            </div>
        </div>
    );
}
