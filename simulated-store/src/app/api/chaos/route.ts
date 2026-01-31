/**
 * Chaos Control API - Agent calls this to FIX issues
 */
import { NextRequest, NextResponse } from 'next/server';
import {
    getChaosState,
    setChaosMode,
    disableAllChaos,
    ChaosState
} from '@/lib/chaos';

// GET - Get current chaos state
export async function GET() {
    return NextResponse.json({
        chaos_state: getChaosState(),
        message: 'Current chaos state',
    });
}

// POST - Control chaos modes (this is how agent FIXES issues!)
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action, mode, token } = body;

    // Validate token for agent actions
    const isAgent = token === 'self-healing-agent-token';

    if (action === 'disable' && mode) {
        // Disable specific chaos mode (THE FIX!)
        setChaosMode(mode as keyof ChaosState, false);
        return NextResponse.json({
            success: true,
            message: `Chaos mode '${mode}' disabled${isAgent ? ' by agent' : ''}`,
            fixed: true,
            chaos_state: getChaosState(),
        });
    }

    if (action === 'enable' && mode) {
        // Enable chaos mode (for testing)
        setChaosMode(mode as keyof ChaosState, true);
        return NextResponse.json({
            success: true,
            message: `Chaos mode '${mode}' enabled`,
            chaos_state: getChaosState(),
        });
    }

    if (action === 'disable_all') {
        // Emergency fix - disable all chaos
        disableAllChaos();
        return NextResponse.json({
            success: true,
            message: 'All chaos modes disabled',
            fixed: true,
            chaos_state: getChaosState(),
        });
    }

    if (action === 'toggle' && mode) {
        const current = getChaosState()[mode as keyof ChaosState];
        setChaosMode(mode as keyof ChaosState, !current);
        return NextResponse.json({
            success: true,
            message: `Chaos mode '${mode}' ${!current ? 'enabled' : 'disabled'}`,
            chaos_state: getChaosState(),
        });
    }

    return NextResponse.json(
        { error: 'Invalid action. Use: enable, disable, toggle, disable_all' },
        { status: 400 }
    );
}
