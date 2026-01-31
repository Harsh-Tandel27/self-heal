'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    AlertTriangle,
    GitBranch,
    Database,
    ClipboardList,
    Settings,
    Zap,
    Activity,
    Bot,
} from 'lucide-react';
import SandboxWidget from './SandboxWidget';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sandbox', label: 'Sandbox', icon: Bot, highlight: true },
    { href: '/issues', label: 'Issues', icon: AlertTriangle },
    { href: '/workflows', label: 'Workflows', icon: GitBranch },
    { href: '/data-control', label: 'Data Control', icon: Database },
    { href: '/audit', label: 'Audit Trail', icon: ClipboardList },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Self-Healing</h1>
                        <p className="text-xs text-slate-400">Support Agent</p>
                    </div>
                </div>
            </div>

            {/* Agent Status */}
            <div className="p-4 mx-4 mt-4 rounded-lg bg-slate-800">
                <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium">Agent Status</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="status-dot running"></span>
                    <span className="text-sm text-green-400">Running</span>
                </div>
            </div>

            {/* Sandbox Widget - Global Access */}
            <div className="mx-4 mt-4">
                <SandboxWidget />
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive
                                            ? 'bg-primary-600 text-white'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700">
                <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
                >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                </Link>
            </div>
        </aside>
    );
}
