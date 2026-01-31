'use client';

import { useState, useEffect } from 'react';

interface Product {
    id: number;
    name: string;
    price: number;
    image: string;
    stock: number;
}

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cart, setCart] = useState<Record<number, number>>({});

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/products');
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to load products');
            }
            const data = await res.json();
            setProducts(data.products);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function addToCart(productId: number) {
        setCart(prev => ({
            ...prev,
            [productId]: (prev[productId] || 0) + 1
        }));
    }

    const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 0'
            }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Our Products</h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>
                        Quality tech products for your workspace
                    </p>
                </div>
                {cartCount > 0 && (
                    <a href="/cart" className="btn btn-primary">
                        🛒 Cart ({cartCount})
                    </a>
                )}
            </div>

            {error && (
                <div className="alert alert-error">
                    <span>⚠️</span>
                    <div>
                        <strong>Error loading products!</strong>
                        <p style={{ fontSize: 14, marginTop: 4 }}>{error}</p>
                        <button
                            onClick={fetchProducts}
                            className="btn btn-danger"
                            style={{ marginTop: 8, padding: '8px 16px' }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48 }}>⏳</div>
                    <p style={{ color: '#64748b', marginTop: 16 }}>Loading products...</p>
                </div>
            ) : (
                <div className="products-grid">
                    {products.map(product => (
                        <div key={product.id} className="card product-card">
                            <div className="product-image">{product.image}</div>
                            <h3 className="product-name">{product.name}</h3>
                            <div className="product-price">${product.price.toFixed(2)}</div>
                            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
                                {product.stock} in stock
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => addToCart(product.id)}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                Add to Cart
                                {cart[product.id] && ` (${cart[product.id]})`}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
