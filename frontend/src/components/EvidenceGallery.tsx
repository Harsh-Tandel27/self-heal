'use client';

import { useState } from 'react';
import { Camera, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EvidenceImage {
    url: string;
    label: string;
    timestamp: string;
}

export default function EvidenceGallery({ steps }: { steps: any[] }) {
    // Extract successful screenshot results from steps
    const screenshots = steps
        .filter(s => s.action_type === 'take_screenshot' && s.status === 'completed' && s.result?.file_url)
        .map(s => ({
            url: `http://localhost:8000${s.result.file_url}`,
            label: s.parameters?.label || 'evidence',
            timestamp: s.completed_at
        }));

    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    if (screenshots.length === 0) return null;

    return (
        <div className="glass-card p-6 rounded-2xl animate-fade-in mt-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-500" />
                Visual Evidence
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((shot, idx) => (
                    <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in bg-slate-100 dark:bg-slate-800"
                        onClick={() => setSelectedImage(shot.url)}
                    >
                        {/* Label Badge */}
                        <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide z-10 shadow-sm
              ${shot.label.includes('before') ? 'bg-rose-500 text-white' :
                                shot.label.includes('after') ? 'bg-emerald-500 text-white' :
                                    'bg-slate-800 text-white'}
            `}>
                            {shot.label.replace('_', ' ')}
                        </div>

                        <img
                            src={shot.url}
                            alt={shot.label}
                            className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <ZoomIn className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button className="absolute top-4 right-4 text-white hover:text-rose-400 p-2">
                            <X className="w-8 h-8" />
                        </button>
                        <motion.img
                            src={selectedImage}
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl bg-black"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
