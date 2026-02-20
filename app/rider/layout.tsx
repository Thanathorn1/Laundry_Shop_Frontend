"use client";

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function RiderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAdminSession, setIsAdminSession] = useState(false);

    useEffect(() => {
        const authRole = localStorage.getItem('auth_role');
        const legacyRole = localStorage.getItem('user_role');
        setIsAdminSession(authRole === 'admin' || legacyRole === 'admin');
    }, []);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-blue-900">
            <Script
                src="https://api.longdo.com/map/?key=312b323631623932623337656637376363653139366538353361376532346633"
                strategy="beforeInteractive"
            />
            {/* Sidebar */}
            <aside className="w-72 border-r border-slate-200 bg-white p-8 shadow-sm h-screen sticky top-0">
                <div className="flex items-center gap-3 mb-10">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-white font-black text-xl">L</span>
                    </div>
                    <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">Laundry Rider</h2>
                </div>
                <nav className="space-y-1.5">
                    <Link href="/rider" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">📦</span>
                        Available Orders
                    </Link>
                    <Link href="/rider/tasks" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">📋</span>
                        My Tasks
                    </Link>
                    <Link href="/rider/profile" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">👤</span>
                        Profile
                    </Link>
                    {isAdminSession && (
                        <>
                            <div className="px-4 pt-4 text-[10px] font-black text-blue-300 uppercase tracking-widest">Admin</div>
                            <Link href="/admin" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">📊</span>
                                Dashboard
                            </Link>
                            <Link href="/admin/customers" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">👤</span>
                                Customer List
                            </Link>
                            <Link href="/admin/riders" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🛵</span>
                                Rider List
                            </Link>
                            <Link href="/admin/pin-shop" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">📍</span>
                                Pin Shop
                            </Link>
                        </>
                    )}
                    <div className="pt-6 mt-6 border-t border-slate-100">
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.href = '/';
                            }}
                            className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all group"
                        >
                            <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🚪</span>
                            Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    );
}
