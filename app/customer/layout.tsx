"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home,
    PlusCircle,
    Star,
    Settings,
    Calendar,
    Users,
    Bike,
    Shield,
    MapPin,
    LogOut,
    Menu,
    X
} from 'lucide-react';

function getRoleFromAccessToken(token: string | null): 'user' | 'rider' | 'admin' | 'employee' | null {
    if (!token) return null;
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;

        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const json = atob(padded);
        const parsed = JSON.parse(json) as { role?: string };

        if (parsed.role === 'admin' || parsed.role === 'rider' || parsed.role === 'user' || parsed.role === 'employee') {
            return parsed.role;
        }
        return null;
    } catch {
        return null;
    }
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdminSession, setIsAdminSession] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const tokenRole = getRoleFromAccessToken(token);
        const storedAuthRole = localStorage.getItem('auth_role');
        const authRole = storedAuthRole || tokenRole;

        if (tokenRole && storedAuthRole !== tokenRole) {
            localStorage.setItem('auth_role', tokenRole);
        }

        if (authRole === 'admin' && !isAdminSession) {
            setIsAdminSession(true);
        }
    }, [isAdminSession]);

    // Close menu when path changes
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    const navItems = [
        { href: '/customer', label: 'Dashboard', icon: Home },
        { href: '/customer/create-order', label: 'New Order', icon: PlusCircle },
        { href: '/customer/orders', label: 'My Orders & Ratings', icon: Star },
        { href: '/customer/settings', label: 'Profile Settings', icon: Settings },
    ];

    const adminItems = [
        { href: '/admin/customers?from=customer', label: 'Customer List', icon: Users },
        { href: '/admin/riders?from=customer', label: 'Rider List', icon: Bike },
        { href: '/admin/admins?from=customer', label: 'Admin List', icon: Shield },
        { href: '/admin/pin-shop?from=customer', label: 'Pin Shop', icon: MapPin },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-blue-900">
            {/* Top Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-blue-50 bg-white shadow-sm">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/customer')}>
                        <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 transition-transform group-hover:rotate-6">
                            <span className="text-white font-black text-xl">C</span>
                        </div>
                        <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase hidden md:block">Laundry Client</h2>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 font-bold">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center rounded-xl px-4 py-2.5 text-sm transition-all duration-200 border transform hover:scale-[1.02] active:scale-[0.98] ${isActive
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-100 border-blue-600'
                                        : 'text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 border-transparent'
                                        }`}
                                >
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Link>
                            );
                        })}

                        {isAdminSession && (
                            <div className="h-6 w-px bg-slate-200 mx-2" />
                        )}

                        {isAdminSession && (
                            <div className="flex items-center gap-1">
                                {adminItems.map((item) => {
                                    const isActive = pathname.startsWith(item.href.split('?')[0]);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            title={item.label}
                                            className={`p-2.5 rounded-xl transition-all duration-200 border transform hover:scale-[1.02] active:scale-[0.98] ${isActive
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 border-transparent'
                                                }`}
                                        >
                                            <item.icon className="h-5 w-5" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        <div className="h-6 w-px bg-slate-200 mx-2" />

                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.href = '/';
                            }}
                            className="flex items-center rounded-xl px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all duration-200 border border-transparent hover:border-rose-100 transform hover:scale-[1.02] active:scale-[0.98] group"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </button>
                    </nav>

                    {/* Hamburger Button */}
                    <button
                        className="lg:hidden p-2 rounded-xl bg-slate-50 text-blue-900 border border-slate-200"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {isMenuOpen && (
                    <div className="lg:hidden fixed inset-0 top-20 z-40 bg-white p-6 overflow-y-auto border-t border-slate-100">
                        <nav className="flex flex-col gap-2 font-bold">
                            <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-4 pb-2">Navigation</div>
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center rounded-xl px-4 py-4 transition-all duration-200 border ${isActive
                                            ? 'bg-blue-600 text-white shadow-md border-blue-600'
                                            : 'text-blue-700/60 hover:bg-blue-50 border-transparent'
                                            }`}
                                    >
                                        <item.icon className="mr-3 h-5 w-5" />
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {isAdminSession && (
                                <>
                                    <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-4 pt-4 pb-2">Admin Control</div>
                                    {adminItems.map((item) => {
                                        const isActive = pathname.startsWith(item.href.split('?')[0]);
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center rounded-xl px-4 py-4 transition-all duration-200 border ${isActive
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : 'text-blue-700/60 hover:bg-blue-50 border-transparent'
                                                    }`}
                                            >
                                                <item.icon className="mr-3 h-5 w-5" />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </>
                            )}

                            <div className="h-px bg-slate-100 my-4" />

                            <button
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.href = '/';
                                }}
                                className="flex items-center rounded-xl px-4 py-4 text-rose-500 hover:bg-rose-50 transition-all duration-200 border border-transparent hover:border-rose-100"
                            >
                                <LogOut className="mr-3 h-5 w-5" />
                                Logout
                            </button>
                        </nav>
                    </div>
                )}
            </header>

            {/* Main Content Area - Full width */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
