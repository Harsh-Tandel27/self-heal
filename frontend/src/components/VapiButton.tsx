'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X } from 'lucide-react';

interface VapiButtonProps {
    onVoiceCommand: (command: string) => void;
}

// Voice commands mapping
const VOICE_COMMANDS = [
    { trigger: 'fix fashionhub', action: 'fix_fashionhub', response: 'Fixing FashionHub issue...' },
    { trigger: 'fix techmart', action: 'fix_techmart', response: 'Fixing TechMart issue...' },
    { trigger: 'fix sportsgear', action: 'fix_sportsgear', response: 'Fixing SportsGear issue...' },
    { trigger: 'show issues', action: 'show_issues', response: 'Showing all open issues...' },
    { trigger: 'approve all', action: 'approve_all', response: 'Approving all pending workflows...' },
    { trigger: 'status', action: 'status', response: 'Agent is running normally...' },
];

export default function VapiButton({ onVoiceCommand }: VapiButtonProps) {
    const [isActive, setIsActive] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleClick = () => {
        if (!isActive) {
            setIsActive(true);
            setIsExpanded(true);
            setIsListening(true);
            setTranscript('');
            setResponse('Listening...');

            // Simulate voice recognition
            setTimeout(() => {
                simulateVoiceInput();
            }, 2000);
        } else {
            stopListening();
        }
    };

    const stopListening = () => {
        setIsListening(false);
        setIsActive(false);
        setTimeout(() => {
            setIsExpanded(false);
            setTranscript('');
            setResponse('');
        }, 1000);
    };

    const simulateVoiceInput = () => {
        // Simulate a random voice command for demo
        const commands = ['Fix the FashionHub issue', 'Show status', 'Fix TechMart API error'];
        const randomCommand = commands[Math.floor(Math.random() * commands.length)];

        setTranscript(randomCommand);
        setIsListening(false);

        // Find matching command
        const matchedCommand = VOICE_COMMANDS.find(
            cmd => randomCommand.toLowerCase().includes(cmd.trigger)
        );

        if (matchedCommand) {
            setResponse(matchedCommand.response);
            onVoiceCommand(matchedCommand.action);
        } else {
            setResponse(`Processing: "${randomCommand}"`);
            onVoiceCommand(randomCommand);
        }

        setTimeout(stopListening, 3000);
    };

    // Waveform bars for animation
    const bars = [1, 2, 3, 4, 5, 4, 3, 2, 1];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        className="absolute bottom-16 right-0 w-80 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden mb-2"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                            <span className="text-sm font-medium text-white">Voice Assistant</span>
                            <button
                                onClick={stopListening}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Waveform */}
                        <div className="p-6 flex items-center justify-center gap-1">
                            {isListening ? (
                                bars.map((height, index) => (
                                    <motion.div
                                        key={index}
                                        className="w-1.5 bg-primary-500 rounded-full"
                                        animate={{
                                            height: [height * 4, height * 12, height * 4],
                                        }}
                                        transition={{
                                            duration: 0.5,
                                            repeat: Infinity,
                                            delay: index * 0.1,
                                        }}
                                    />
                                ))
                            ) : (
                                <div className="h-12 flex items-center">
                                    <span className="text-green-400 text-sm">
                                        {response || 'Ready'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Transcript */}
                        {transcript && (
                            <div className="px-4 pb-4">
                                <div className="text-xs text-slate-500 mb-1">Heard:</div>
                                <div className="text-sm text-white">&ldquo;{transcript}&rdquo;</div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Button */}
            <motion.button
                onClick={handleClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${isActive
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-primary-600 hover:bg-primary-700'
                    }`}
            >
                {isActive ? (
                    <MicOff className="w-6 h-6 text-white" />
                ) : (
                    <Mic className="w-6 h-6 text-white" />
                )}

                {/* Pulse ring when active */}
                {isActive && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-red-500"
                        animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                )}
            </motion.button>
        </div>
    );
}
