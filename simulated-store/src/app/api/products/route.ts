/**
 * Products API - Can fail when chaos is enabled
 */
import { NextResponse } from 'next/server';
import { shouldFail, simulateDelay } from '@/lib/chaos';
import { reportApiError } from '@/lib/reporter';

const PRODUCTS = [
    { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧', stock: 50 },
    { id: 2, name: 'Smart Watch', price: 199.99, image: '⌚', stock: 30 },
    { id: 3, name: 'Laptop Stand', price: 49.99, image: '💻', stock: 100 },
    { id: 4, name: 'USB-C Hub', price: 39.99, image: '🔌', stock: 75 },
    { id: 5, name: 'Mechanical Keyboard', price: 129.99, image: '⌨️', stock: 25 },
    { id: 6, name: 'Webcam HD', price: 89.99, image: '📷', stock: 40 },
    { id: 7, name: 'Desk Lamp', price: 34.99, image: '💡', stock: 60 },
    { id: 8, name: 'Mouse Pad XL', price: 19.99, image: '🖱️', stock: 200 },
];

export async function GET() {
    // Simulate slow mode
    await simulateDelay();

    // Check if API should fail
    if (shouldFail('api_errors')) {
        // Report to agent
        await reportApiError({
            endpoint: '/api/products',
            statusCode: 500,
            errorMessage: 'Internal server error - database connection failed',
            chaosMode: 'api_errors',
        });

        return NextResponse.json(
            { error: 'Internal server error', code: 'DB_CONNECTION_FAILED' },
            { status: 500 }
        );
    }

    // Check migration mode - old endpoint fails
    if (shouldFail('migration_mode')) {
        await reportApiError({
            endpoint: '/api/products (v1 - deprecated)',
            statusCode: 404,
            errorMessage: 'Endpoint deprecated after headless migration. Use /api/v2/products',
            chaosMode: 'migration_mode',
        });

        return NextResponse.json(
            { error: 'Endpoint not found. API has been migrated.', code: 'ENDPOINT_DEPRECATED' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        products: PRODUCTS,
        count: PRODUCTS.length,
    });
}
