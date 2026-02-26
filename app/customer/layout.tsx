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
    X,
    ChevronDown,
    User
} from 'lucide-react';
import { apiFetch, resolveImageUrl, triggerProfileUpdate, PROFILE_UPDATE_EVENT } from '@/lib/api';

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
    const [profile, setProfile] = useState<{ firstName: string; lastName: string; profileImageUrl?: string } | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

        if (token) {
            apiFetch('/customers/profile').then(data => {
                setProfile(data);
            }).catch(() => {
                // Ignore errors for now or handle silently
            });
        }
    }, [isAdminSession]);

    // Handle profile updates from other components
    useEffect(() => {
        const handleProfileUpdate = () => {
            apiFetch('/customers/profile').then(data => {
                setProfile(data);
            }).catch(() => { });
        };

        window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
        return () => window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    }, []);

    // Close menu/dropdown when path changes
    useEffect(() => {
        setIsMenuOpen(false);
        setIsDropdownOpen(false);
    }, [pathname]);

    const navItems = [
        { href: '/customer', label: 'Dashboard', icon: Home },
        { href: '/customer/create-order', label: 'New Order', icon: PlusCircle },
        { href: '/customer/orders', label: 'My Orders & Ratings', icon: Star },
    ];

    const adminItems = [
        { href: '/admin/customers?from=customer', label: 'Customer List', icon: Users },
        { href: '/admin/riders?from=customer', label: 'Rider List', icon: Bike },
        { href: '/admin/admins?from=customer', label: 'Admin List', icon: Shield },
        { href: '/admin/pin-shop?from=customer', label: 'Pin Shop', icon: MapPin },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-blue-900 transition-colors duration-500">
            {/* Immersive Background Layer */}
            <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px] animate-float" />
                <div className="absolute bottom-[20%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-400/10 blur-[100px] animate-float-slow" />
            </div>
            {/* Top Navbar */}
            <header className="sticky top-0 z-[100] w-full glass-morphism border-b border-white/20 shadow-premium">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/customer')}>
                        <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-premium transition-all group-hover:rotate-6 group-hover:scale-110">
                            <span className="text-white font-black text-xl">C</span>
                        </div>
                        <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase hidden md:block group-hover:text-blue-600 transition-colors">Laundry Client</h2>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 font-bold">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`relative flex items-center rounded-2xl px-5 py-2.5 text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${isActive
                                        ? 'text-blue-100'
                                        : 'text-blue-900/60 hover:text-blue-900'
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 bg-blue-600 rounded-2xl -z-10 shadow-premium animate-blur-in" />
                                    )}
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
                                            className={`p-2.5 rounded-2xl transition-all duration-200 border transform hover:scale-[1.02] active:scale-[0.98] ${isActive
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
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full glass-morphism border border-white/20 hover:border-blue-300 transition-all active:scale-95 group shadow-soft"
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white overflow-hidden shadow-sm">
                                    {profile?.profileImageUrl ? (
                                        <img src={resolveImageUrl(profile.profileImageUrl) || ''} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-black">{profile?.firstName?.charAt(0) || <User className="h-4 w-4" />}</span>
                                    )}
                                </div>
                                <span className="text-sm font-black text-blue-900 hidden sm:block">{profile?.firstName || 'User'}</span>
                                <ChevronDown className={`h-4 w-4 text-blue-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl shadow-blue-900/20 border border-blue-50 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-4 py-2 mb-1">
                                            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Account</p>
                                        </div>
                                        <Link
                                            href="/customer/settings"
                                            className={`flex items-center px-4 py-2.5 text-sm font-bold transition-all ${pathname === '/customer/settings' ? 'bg-blue-50 text-blue-700' : 'text-blue-700/60 hover:bg-blue-50 hover:text-blue-700'}`}
                                        >
                                            <Settings className="mr-2.5 h-4 w-4" />
                                            Profile Settings
                                        </Link>
                                        <div className="h-px bg-slate-50 my-1 mx-2" />
                                        <button
                                            onClick={() => {
                                                localStorage.clear();
                                                window.location.href = '/';
                                            }}
                                            className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all"
                                        >
                                            <LogOut className="mr-2.5 h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
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
                {
                    isMenuOpen && (
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
                    )
                }
            </header >

            {/* Main Content Area - Full width */}
            < main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" >
                {children}
            </main >
        </div >
    );
}
