"use client";

import Link from 'next/link';

export default function CustomerPage() {
    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-blue-900">
            {/* Sidebar */}
            <aside className="w-72 border-r border-blue-50 bg-white p-8 shadow-sm h-screen sticky top-0">
                <div className="flex items-center gap-3 mb-10">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-white font-black text-xl">C</span>
                    </div>
                    <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">Laundry Client</h2>
                </div>
                <nav className="space-y-1.5">
                    <Link href="/customer" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold bg-blue-50 text-blue-700 shadow-sm transition-all border border-blue-100">
                        <span className="mr-3 text-lg">🏠</span>
                        Dashboard
                    </Link>
                    <button className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">➕</span>
                        New Order
                    </button>
                    <button className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">📅</span>
                        History
                    </button>
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
            <main className="flex-1 p-12">
                <div className="flex items-center justify-between mb-12">
                    <header>
                        <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2">Hello, Khun Somchai!</h1>
                        <p className="text-blue-700/60 font-medium">Ready for some fresh and clean clothes today?</p>
                    </header>
                    <button className="bg-blue-600 px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">
                        Create New Order
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-white">
                        <h3 className="text-xl font-black text-blue-900 mb-6">Current Orders</h3>
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border border-dashed border-blue-200">
                            <span className="text-4xl mb-4">✨</span>
                            <p className="text-blue-400 font-bold">Everything is clean! No active orders.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-white">
                        <h3 className="text-xl font-black text-blue-900 mb-6">Service Promos</h3>
                        <div className="grid gap-4">
                            <div className="p-6 rounded-3xl bg-blue-600 text-white relative overflow-hidden shadow-lg shadow-blue-100">
                                <div className="absolute top-0 right-0 h-24 w-24 bg-white/10 rounded-bl-full -mr-8 -mt-8"></div>
                                <h4 className="text-lg font-black mb-1">Weekend Special</h4>
                                <p className="text-white/80 text-sm font-bold">20% OFF for all drying services!</p>
                            </div>
                            <div className="p-6 rounded-3xl bg-sky-500 text-white relative overflow-hidden shadow-lg shadow-sky-100">
                                <div className="absolute top-0 right-0 h-24 w-24 bg-white/10 rounded-bl-full -mr-8 -mt-8"></div>
                                <h4 className="text-lg font-black mb-1">Free Delivery</h4>
                                <p className="text-white/80 text-sm font-bold">For orders over ฿500. Order now!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
