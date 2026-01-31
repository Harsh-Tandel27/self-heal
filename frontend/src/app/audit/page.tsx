'use client';

import { useState, useEffect } from 'react';
import {
    ClipboardList,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Filter,
    RefreshCw
} from 'lucide-react';

interface AuditLog {
    _id: string;
    event_type: string;
    timestamp: string;
    actor: string;
    action: string;
    description: string;
    success: boolean;
    issue_id: string | null;
    workflow_id: string | null;
    reasoning: string | null;
    confidence: number | null;
}

const API_BASE = 'http://localhost:8000';

export default function AuditPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState('');

    useEffect(() => {
        fetchLogs();
    }, [eventFilter]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const params = eventFilter ? `?event_type=${eventFilter}` : '';
            const res = await fetch(`${API_BASE}/api/audit${params}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
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
                        Audit Trail
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Complete history of agent actions and decisions
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Filter */}
            <div className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Event Type:</span>
                </div>
                <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
                >
                    <option value="">All Events</option>
                    <option value="signal_received">Signal Received</option>
                    <option value="issue_detected">Issue Detected</option>
                    <option value="workflow_created">Workflow Created</option>
                    <option value="workflow_approved">Workflow Approved</option>
                    <option value="workflow_rejected">Workflow Rejected</option>
                    <option value="step_executed">Step Executed</option>
                    <option value="workflow_completed">Workflow Completed</option>
                </select>
            </div>

            {/* Logs */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">No audit logs</h3>
                    <p className="text-slate-500 mt-2">Agent activity will appear here</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    Time
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    Event
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    Actor
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {logs.map((log) => (
                                <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <EventTypeBadge type={log.event_type} />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate">
                                        {log.description}
                                        {log.confidence && (
                                            <span className="ml-2 text-xs text-slate-500">
                                                ({Math.round(log.confidence * 100)}% conf.)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                        <span className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${log.actor === 'agent'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }
                    `}>
                                            {log.actor}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {log.success ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function EventTypeBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        signal_received: 'bg-blue-100 text-blue-700',
        issue_detected: 'bg-orange-100 text-orange-700',
        issue_analyzed: 'bg-purple-100 text-purple-700',
        workflow_created: 'bg-indigo-100 text-indigo-700',
        workflow_approved: 'bg-green-100 text-green-700',
        workflow_rejected: 'bg-red-100 text-red-700',
        workflow_started: 'bg-cyan-100 text-cyan-700',
        step_executed: 'bg-teal-100 text-teal-700',
        step_failed: 'bg-red-100 text-red-700',
        workflow_completed: 'bg-green-100 text-green-700',
        workflow_rolled_back: 'bg-gray-100 text-gray-700',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
            {type.replace(/_/g, ' ')}
        </span>
    );
}
