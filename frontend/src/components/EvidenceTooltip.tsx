'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, FileText, Code, ExternalLink } from 'lucide-react';

interface EvidenceTooltipProps {
    evidence: {
        type: 'documentation' | 'log' | 'config';
        source: string;
        excerpt: string;
        lineNumber?: number;
        url?: string;
    };
    children: React.ReactNode;
}

export default function EvidenceTooltip({ evidence, children }: EvidenceTooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    const getIcon = () => {
        switch (evidence.type) {
            case 'documentation':
                return <FileText className="w-4 h-4" />;
            case 'log':
                return <Code className="w-4 h-4" />;
            case 'config':
                return <HelpCircle className="w-4 h-4" />;
        }
    };

    const getTypeLabel = () => {
        switch (evidence.type) {
            case 'documentation':
                return 'Documentation Reference';
            case 'log':
                return 'Log Entry';
            case 'config':
                return 'Configuration';
        }
    };

    return (
        <div className="relative inline-flex items-center gap-1">
            {children}
            <button
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                className="text-slate-400 hover:text-primary-500 transition-colors"
            >
                <HelpCircle className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-2 z-50 w-80"
                    >
                        <div className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden">
                            {/* Header */}
                            <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
                                <span className="text-primary-400">{getIcon()}</span>
                                <span className="text-xs font-medium text-slate-300">{getTypeLabel()}</span>
                            </div>

                            {/* Content */}
                            <div className="p-3">
                                <div className="text-xs text-slate-400 mb-2">
                                    Source: <span className="text-slate-300">{evidence.source}</span>
                                    {evidence.lineNumber && (
                                        <span className="text-slate-500"> (Line {evidence.lineNumber})</span>
                                    )}
                                </div>

                                <div className="bg-slate-900 rounded p-2 font-mono text-xs text-slate-300 border border-slate-700">
                                    <pre className="whitespace-pre-wrap">{evidence.excerpt}</pre>
                                </div>

                                {evidence.url && (
                                    <a
                                        href={evidence.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
                                    >
                                        View full document
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="absolute top-full left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-800" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
