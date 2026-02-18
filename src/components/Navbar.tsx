"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const name = localStorage.getItem('userName');
        const role = localStorage.getItem('userRole');
        if (name && role) setUser({ name, role });

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
        router.push('/');
    };

    const getRoleBadge = (role: string) => {
        if (role === 'admin') return <span className="badge-admin">Admin</span>;
        if (role === 'rider') return <span className="badge-rider">Rider</span>;
        return <span className="badge-user">Customer</span>;
    };

    const getNavLinks = () => {
        if (!user) return null;
        if (user.role === 'admin') return (
            <>
                <Link href="/admin" className="text-gray-600 hover:text-primary font-medium transition">Dashboard</Link>
                <Link href="/admin/shops" className="text-gray-600 hover:text-primary font-medium transition">Shops</Link>
                <Link href="/admin/orders" className="text-gray-600 hover:text-primary font-medium transition">Orders</Link>
                <Link href="/admin/riders" className="text-gray-600 hover:text-primary font-medium transition">Riders</Link>
            </>
        );
        if (user.role === 'rider') return (
            <>
                <Link href="/rider" className="text-gray-600 hover:text-primary font-medium transition">Dashboard</Link>
                <Link href="/rider/orders" className="text-gray-600 hover:text-primary font-medium transition">My Jobs</Link>
            </>
        );
        return (
            <>
                <Link href="/dashboard" className="text-gray-600 hover:text-primary font-medium transition">Dashboard</Link>
                <Link href="/order" className="text-gray-600 hover:text-primary font-medium transition">Order</Link>
                <Link href="/track" className="text-gray-600 hover:text-primary font-medium transition">Track</Link>
                <Link href="/book" className="text-gray-600 hover:text-primary font-medium transition">Book Machine</Link>
            </>
        );
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-blue-sm' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-9 h-9 gradient-blue rounded-xl flex items-center justify-center shadow-blue-sm">
                            <span className="text-white text-lg">🫧</span>
                        </div>
                        <span className="text-xl font-bold text-primary">Laundry<span className="text-primary-light">Pro</span></span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-6">
                        {getNavLinks()}
                    </div>

                    {/* Auth */}
                    <div className="hidden md:flex items-center space-x-3">
                        {user ? (
                            <div className="flex items-center space-x-3">
                                {getRoleBadge(user.role)}
                                <span className="text-gray-700 font-medium text-sm">{user.name}</span>
                                <button onClick={handleLogout} className="btn-outline text-sm py-2 px-4">Logout</button>
                            </div>
                        ) : (
                            <>
                                <Link href="/login" className="text-primary font-semibold hover:text-primary-light transition">Login</Link>
                                <Link href="/register" className="btn-primary text-sm py-2 px-5">Get Started</Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
                        <div className={`w-6 h-0.5 bg-primary mb-1.5 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
                        <div className={`w-6 h-0.5 bg-primary mb-1.5 transition-all ${menuOpen ? 'opacity-0' : ''}`}></div>
                        <div className={`w-6 h-0.5 bg-primary transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
                    </button>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden glass rounded-2xl mb-4 p-4 space-y-3">
                        {getNavLinks()}
                        {user ? (
                            <button onClick={handleLogout} className="w-full btn-outline text-sm py-2">Logout</button>
                        ) : (
                            <div className="flex space-x-2">
                                <Link href="/login" className="flex-1 text-center btn-outline text-sm py-2">Login</Link>
                                <Link href="/register" className="flex-1 text-center btn-primary text-sm py-2">Register</Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
