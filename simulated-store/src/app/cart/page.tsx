'use client';

import { useState } from 'react';

// Demo cart items
const DEMO_CART = [
    { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧', quantity: 1 },
    { id: 2, name: 'Smart Watch', price: 199.99, image: '⌚', quantity: 1 },
];

export default function CartPage() {
    const [cart, setCart] = useState(DEMO_CART);
    const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [orderResult, setOrderResult] = useState<any>(null);

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    async function handleCheckout() {
        setCheckoutStatus('loading');
        setOrderResult(null);

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartItems: cart,
                    total,
                    customerId: 'customer_demo_123',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setCheckoutStatus('error');
                setOrderResult(data);
            } else {
                setCheckoutStatus('success');
                setOrderResult(data);
                setCart([]);
            }
        } catch (e: any) {
            setCheckoutStatus('error');
            setOrderResult({ error: e.message });
        }
    }

    return (
        <div style={{ padding: '40px 0', maxWidth: 600, margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: 24 }}>
                🛒 Shopping Cart
            </h1>

            {checkoutStatus === 'success' ? (
                <div className="alert alert-success">
                    <span style={{ fontSize: 24 }}>✅</span>
                    <div>
                        <strong>Order Placed Successfully!</strong>
                        <p style={{ fontSize: 14, marginTop: 4 }}>
                            Order ID: {orderResult?.orderId}
                        </p>
                    </div>
                </div>
            ) : checkoutStatus === 'error' ? (
                <div className="alert alert-error">
                    <span style={{ fontSize: 24 }}>❌</span>
                    <div>
                        <strong>Checkout Failed!</strong>
                        <p style={{ fontSize: 14, marginTop: 4 }}>
                            {orderResult?.message || orderResult?.error}
                        </p>
                        <p style={{ fontSize: 12, marginTop: 8, color: '#9ca3af' }}>
                            Error Code: {orderResult?.code}
                        </p>
                        <button
                            onClick={handleCheckout}
                            className="btn btn-danger"
                            style={{ marginTop: 12 }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            ) : null}

            {cart.length === 0 && checkoutStatus !== 'success' ? (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 48 }}>🛒</div>
                    <p style={{ color: '#64748b', marginTop: 16 }}>Your cart is empty</p>
                    <a href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                        Browse Products
                    </a>
                </div>
            ) : cart.length > 0 ? (
                <>
                    <div className="card" style={{ marginBottom: 24 }}>
                        {cart.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '16px 0',
                                    borderBottom: '1px solid #e2e8f0',
                                }}
                            >
                                <span style={{ fontSize: 32 }}>{item.image}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                    <div style={{ color: '#64748b', fontSize: 14 }}>
                                        Qty: {item.quantity}
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, color: '#4f46e5' }}>
                                    ${(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '16px 0',
                                fontWeight: 700,
                                fontSize: 18,
                            }}
                        >
                            <span>Total</span>
                            <span style={{ color: '#4f46e5' }}>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        className="btn btn-primary"
                        disabled={checkoutStatus === 'loading'}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: 16,
                            fontSize: 16,
                        }}
                    >
                        {checkoutStatus === 'loading' ? '⏳ Processing...' : '💳 Checkout'}
                    </button>
                </>
            ) : null}
        </div>
    );
}
