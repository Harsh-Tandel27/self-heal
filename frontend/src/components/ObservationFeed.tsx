'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Play,
    RefreshCw,
    Wrench,
    AlertTriangle,
    ShieldAlert,
} from 'lucide-react';
import { FAILURE_SCENARIOS, FailureScenario, updateScenarioStatus } from '@/data/scenarios';
import EvidenceTooltip from './EvidenceTooltip';
import TerminalModal from './TerminalModal';

interface ObservationFeedProps {
    onVoiceCommand?: string;
}

export default function ObservationFeed({ onVoiceCommand }: ObservationFeedProps) {
    const [scenarios, setScenarios] = useState<FailureScenario[]>(FAILURE_SCENARIOS);
    const [selectedScenario, setSelectedScenario] = useState<FailureScenario | null>(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [executingId, setExecutingId] = useState<string | null>(null);

    // Handle voice commands
    const handleVoiceCommand = useCallback((command: string) => {
        if (command.includes('fashionhub')) {
            const scenario = scenarios.find(s => s.merchant === 'FashionHub');
            if (scenario) executeFixed(scenario);
        } else if (command.includes('techmart')) {
            const scenario = scenarios.find(s => s.merchant === 'TechMart');
            if (scenario) executeFixed(scenario);
        } else if (command.includes('sportsgear')) {
            const scenario = scenarios.find(s => s.merchant === 'SportsGear');
            if (scenario) executeFixed(scenario);
        }
    }, [scenarios]);

    // Execute fix
    const executeFixed = (scenario: FailureScenario) => {
        setSelectedScenario(scenario);
        setExecutingId(scenario.id);
        setIsTerminalOpen(true);

        // Update status to fixing
        setScenarios(prev =>
            prev.map(s =>
                s.id === scenario.id ? { ...s, status: 'fixing' as const } : s
            )
        );
    };

    // Handle terminal complete
    const handleTerminalComplete = () => {
        if (selectedScenario) {
            setScenarios(prev =>
                prev.map(s =>
                    s.id === selectedScenario.id ? { ...s, status: 'resolved' as const } : s
                )
            );
            updateScenarioStatus(selectedScenario.id, 'resolved');
        }
        setExecutingId(null);
    };

    // Reset scenarios for demo
    const resetScenarios = () => {
        setScenarios(FAILURE_SCENARIOS.map(s => ({ ...s, status: 'error' as const })));
    };

    const getStatusIcon = (status: FailureScenario['status']) => {
        switch (status) {
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'investigating':
                return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
            case 'fixing':
                return <Wrench className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'resolved':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        }
    };

    const getSeverityBadge = (severity: FailureScenario['severity']) => {
        const colors = {
            critical: 'bg-red-100 text-red-700 border-red-200',
            high: 'bg-orange-100 text-orange-700 border-orange-200',
            medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[severity]}`}>
                {severity}
            </span>
        );
    };

    const getCategoryIcon = (category: FailureScenario['category']) => {
        switch (category) {
            case 'api_mismatch':
                return <AlertTriangle className="w-4 h-4" />;
            case 'webhook_secret':
                return <ShieldAlert className="w-4 h-4" />;
            case 'cors_policy':
                return <AlertCircle className="w-4 h-4" />;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Observation Feed
                    </h2>
                    <p className="text-sm text-slate-500">Real-time incident detection</p>
                </div>
                <button
                    onClick={resetScenarios}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reset Demo
                </button>
            </div>

            {/* Scenarios List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                <AnimatePresence>
                    {scenarios.map((scenario) => (
                        <motion.div
                            key={scenario.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors ${scenario.status === 'resolved' ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Status Icon */}
                                <motion.div
                                    animate={scenario.status === 'resolved' ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                >
                                    {getStatusIcon(scenario.status)}
                                </motion.div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {scenario.merchant}
                                        </span>
                                        {getSeverityBadge(scenario.severity)}
                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                            {getCategoryIcon(scenario.category)}
                                            {scenario.category.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <h3 className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                                        {scenario.title}
                                    </h3>

                                    {/* Error Log */}
                                    <div className="bg-slate-900 rounded px-3 py-2 font-mono text-xs text-red-400 mb-2">
                                        {scenario.errorLog}
                                    </div>

                                    {/* Root Cause with Evidence */}
                                    <div className="text-sm text-slate-600 dark:text-slate-400">
                                        <EvidenceTooltip evidence={scenario.evidence}>
                                            <span className="font-medium">Root Cause:</span>
                                        </EvidenceTooltip>{' '}
                                        {scenario.rootCause}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0">
                                    {scenario.status === 'error' && (
                                        <button
                                            onClick={() => executeFixed(scenario)}
                                            disabled={executingId !== null}
                                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-400 text-white text-sm font-medium rounded-lg transition-colors"
                                        >
                                            <Play className="w-4 h-4" />
                                            Execute Fix
                                        </button>
                                    )}
                                    {scenario.status === 'fixing' && (
                                        <span className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg">
                                            <Wrench className="w-4 h-4 animate-spin" />
                                            Fixing...
                                        </span>
                                    )}
                                    {scenario.status === 'resolved' && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Resolved
                                        </motion.span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Terminal Modal */}
            {selectedScenario && (
                <TerminalModal
                    isOpen={isTerminalOpen}
                    onClose={() => setIsTerminalOpen(false)}
                    scenario={{
                        id: selectedScenario.id,
                        name: selectedScenario.title,
                        fix: selectedScenario.fix.description,
                    }}
                    onComplete={handleTerminalComplete}
                />
            )}
        </div>
    );
}
