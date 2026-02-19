"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Order {
    _id: string;
    productName: string;
    contactPhone: string;
    status: 'pending' | 'assigned' | 'picked_up' | 'completed' | 'cancelled';
    pickupAddress: string | null;
    pickupType: 'now' | 'schedule';
    pickupAt: string | null;
    totalPrice: number;
    createdAt: string;
    images?: string[];
}

interface CustomerProfile {
    firstName: string;
    lastName: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '⏳' },
    assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '🚴' },
    picked_up: { label: 'Picked Up', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: '📦' },
    completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '✅' },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: '❌' },
};

export default function CustomerPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [ordersData, profileData] = await Promise.all([
                    apiFetch('/customers/orders').catch(() => []),
                    apiFetch('/customers/me').catch(() => null),
                ]);
                setOrders(ordersData);
                setProfile(profileData);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));
    const greeting = profile ? `Hello, ${profile.firstName} ${profile.lastName}!` : 'Hello!';

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
                    <Link href="/customer/create-order" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">➕</span>
                        New Order
                    </Link>
                    <Link href="/customer/history" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">📅</span>
                        History
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
            <main className="flex-1 p-12">
                <div className="flex items-center justify-between mb-12">
                    <header>
                        <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2">{greeting}</h1>
                        <p className="text-blue-700/60 font-medium">Ready for some fresh and clean clothes today?</p>
                    </header>
                    <Link href="/customer/create-order" className="bg-blue-600 px-8 py-4 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all inline-flex items-center justify-center">
                        Create New Order
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Current Orders */}
                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-white">
                        <h3 className="text-xl font-black text-blue-900 mb-6">Current Orders</h3>
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                            </div>
                        ) : activeOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border border-dashed border-blue-200">
                                <span className="text-4xl mb-4">✨</span>
                                <p className="text-blue-400 font-bold">Everything is clean! No active orders.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {activeOrders.map((order) => {
                                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                    return (
                                        <div key={order._id} className={`p-5 rounded-2xl border ${cfg.bg} transition-all hover:shadow-md`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-blue-900 truncate">{order.productName}</h4>
                                                    <p className="text-xs text-blue-500 mt-1">
                                                        {new Date(order.createdAt).toLocaleDateString('th-TH', {
                                                            day: 'numeric', month: 'short', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${cfg.color} ${cfg.bg}`}>
                                                    <span>{cfg.icon}</span> {cfg.label}
                                                </span>
                                            </div>
                                            {order.pickupAddress && (
                                                <p className="text-sm text-blue-700/60 mb-2">
                                                    <span className="font-bold">Pickup:</span> {order.pickupAddress}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-blue-500">
                                                    {order.pickupType === 'schedule' && order.pickupAt
                                                        ? `Scheduled: ${new Date(order.pickupAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                                        : 'Pickup Now'}
                                                </span>
                                                {order.totalPrice > 0 && (
                                                    <span className="text-sm font-black text-blue-900">฿{order.totalPrice.toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right column */}
                    <div className="space-y-8">
                        {/* Service Promos */}
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

                        {/* Recent Completed */}
                        {orders.filter(o => o.status === 'completed').length > 0 && (
                            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-white">
                                <h3 className="text-xl font-black text-blue-900 mb-6">Recently Completed</h3>
                                <div className="space-y-3">
                                    {orders.filter(o => o.status === 'completed').slice(0, 3).map((order) => (
                                        <div key={order._id} className="flex items-center justify-between p-4 rounded-2xl bg-green-50 border border-green-200">
                                            <div>
                                                <h4 className="font-bold text-green-800 text-sm">{order.productName}</h4>
                                                <p className="text-xs text-green-600">
                                                    {new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                            <span className="text-green-600 text-lg">✅</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
