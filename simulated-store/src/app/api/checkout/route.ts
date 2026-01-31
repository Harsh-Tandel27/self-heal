/**
 * Checkout API - Fails when checkout_fails chaos is enabled
 */
import { NextRequest, NextResponse } from 'next/server';
import { shouldFail, simulateDelay, getChaosState } from '@/lib/chaos';
import { reportCheckoutFailure } from '@/lib/reporter';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { cartItems, total, customerId } = body;

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Simulate delay
    await simulateDelay();

    // Check if checkout should fail
    if (shouldFail('checkout_fails')) {
        // Report to agent - this triggers the self-healing!
        await reportCheckoutFailure({
            orderId,
            cartValue: total,
            errorMessage: 'Payment gateway timeout - unable to process payment',
            chaosMode: 'checkout_fails',
        });

        return NextResponse.json(
            {
                error: 'Payment failed',
                code: 'PAYMENT_GATEWAY_TIMEOUT',
                message: 'Unable to process payment. Please try again.',
                orderId,
            },
            { status: 500 }
        );
    }

    // Check migration mode
    if (shouldFail('migration_mode')) {
        await reportCheckoutFailure({
            orderId,
            cartValue: total,
            errorMessage: 'Checkout service configuration mismatch after migration',
            chaosMode: 'migration_mode',
        });

        return NextResponse.json(
            {
                error: 'Configuration error',
                code: 'CHECKOUT_CONFIG_MISMATCH',
                message: 'Checkout service misconfigured. Our team has been notified.',
                orderId,
            },
            { status: 503 }
        );
    }

    // Success!
    return NextResponse.json({
        success: true,
        orderId,
        message: 'Order placed successfully!',
        order: {
            id: orderId,
            items: cartItems,
            total,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
        }
    });
}

export async function GET() {
    // Return chaos status for debugging
    return NextResponse.json({
        checkout_enabled: true,
        chaos_state: getChaosState(),
    });
}
