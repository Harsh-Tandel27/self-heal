import './globals.css';
import Link from 'next/link';

export const metadata = {
    title: 'TechShop Demo Store',
    description: 'Simulated e-commerce store for self-healing agent demo',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <header>
                    <div className="container">
                        <Link href="/" className="logo">
                            🛒 TechShop
                        </Link>
                        <nav>
                            <Link href="/">Products</Link>
                            <Link href="/cart">Cart</Link>
                            <Link href="/admin">⚡ Chaos Admin</Link>
                        </nav>
                    </div>
                </header>
                <main className="container">
                    {children}
                </main>
            </body>
        </html>
    );
}
