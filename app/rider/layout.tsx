"use client";

import Link from 'next/link';
import Script from 'next/script';

export default function RiderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
