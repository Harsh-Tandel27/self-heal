'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Terminal, CheckCircle, Loader2 } from 'lucide-react';

interface TerminalModalProps {
    isOpen: boolean;
    onClose: () => void;
    scenario: {
        id: string;
        name: string;
        fix: string;
    };
    onComplete: () => void;
}

const TERMINAL_LINES = [
    { text: '$ NexusAgent --apply --fix', delay: 0 },
    { text: '', delay: 200 },
    { text: '🔍 Analyzing incident...', delay: 500 },
    { text: '   └── Identified root cause', delay: 1000 },
    { text: '   └── Preparing remediation steps', delay: 1500 },
    { text: '', delay: 1700 },
    { text: '📡 Connecting to merchant environment...', delay: 2000 },
    { text: '   └── Connection established', delay: 2500 },
    { text: '', delay: 2700 },
    { text: '🔧 Applying fix...', delay: 3000 },
    { text: '   └── {{FIX_DESCRIPTION}}', delay: 3500 },
    { text: '   └── Validating changes', delay: 4000 },
    { text: '', delay: 4200 },
    { text: '✅ Fix applied successfully!', delay: 4500 },
    { text: '', delay: 4700 },
    { text: '📊 Post-fix validation:', delay: 5000 },
    { text: '   └── Health check: PASSED', delay: 5300 },
    { text: '   └── Endpoint test: PASSED', delay: 5600 },
    { text: '   └── Integration test: PASSED', delay: 5900 },
    { text: '', delay: 6100 },
    { text: '🎉 Incident resolved. Merchant notified.', delay: 6500 },
];

export default function TerminalModal({ isOpen, onClose, scenario, onComplete }: TerminalModalProps) {
    const [lines, setLines] = useState<string[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setLines([]);
            setIsComplete(false);
            setCurrentLineIndex(0);
            return;
        }

        const processedLines = TERMINAL_LINES.map(line => ({
            ...line,
            text: line.text.replace('{{FIX_DESCRIPTION}}', scenario.fix)
        }));

        let timeouts: NodeJS.Timeout[] = [];

        processedLines.forEach((line, index) => {
            const timeout = setTimeout(() => {
                setLines(prev => [...prev, line.text]);
                setCurrentLineIndex(index);

                if (index === processedLines.length - 1) {
                    setTimeout(() => {
                        setIsComplete(true);
                        onComplete();
                    }, 500);
                }
            }, line.delay);
            timeouts.push(timeout);
        });

        return () => {
            timeouts.forEach(t => clearTimeout(t));
        };
    }, [isOpen, scenario, onComplete]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-3xl bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <Terminal className="w-4 h-4" />
                                <span>NexusAgent Terminal</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Terminal Body */}
                    <div className="p-4 h-96 overflow-y-auto font-mono text-sm">
                        {lines.map((line, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`${line.includes('✅') || line.includes('🎉')
                                        ? 'text-green-400'
                                        : line.includes('🔍') || line.includes('📡') || line.includes('🔧') || line.includes('📊')
                                            ? 'text-blue-400'
                                            : line.startsWith('$')
                                                ? 'text-yellow-400'
                                                : 'text-slate-300'
                                    }`}
                            >
                                {line || '\u00A0'}
                            </motion.div>
                        ))}

                        {!isComplete && (
                            <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="inline-block w-2 h-4 bg-green-400 ml-1"
                            />
                        )}
                    </div>

                    {/* Terminal Footer */}
                    <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                            {isComplete ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    <span className="text-green-400">Execution complete</span>
                                </>
                            ) : (
                                <>
                                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                    <span className="text-blue-400">Executing fix...</span>
                                </>
                            )}
                        </div>
                        {isComplete && (
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
