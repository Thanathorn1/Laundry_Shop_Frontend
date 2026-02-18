"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-600',
};

export default function DashboardPage() {
    const [userName, setUserName] = useState('Customer');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedName = localStorage.getItem('userName');

        if (savedName) setUserName(savedName);
        if (!token) { router.push('/login'); return; }

        api.get('/orders/my').then(({ data }) => setOrders(data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const totalSpent = orders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const points = Math.floor(totalSpent / 10);

    return (
        <div className="min-h-screen pt-20 pb-12 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Welcome */}
                <div className="gradient-blue rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <p className="text-blue-200 text-sm font-medium mb-1">Welcome back 👋</p>
                        <h1 className="text-3xl font-black">{userName}</h1>
                        <p className="text-blue-200 mt-1">Here's your laundry overview</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { icon: '⭐', label: 'Points', value: points, color: 'text-yellow-500' },
                        { icon: '📦', label: 'Total Orders', value: orders.length, color: 'text-blue-500' },
                        { icon: '💰', label: 'Total Spent', value: `฿${totalSpent}`, color: 'text-green-500' },
                        { icon: '⏳', label: 'Pending', value: orders.filter(o => o.status === 'pending').length, color: 'text-orange-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-blue-sm border border-blue-50 card-hover">
                            <div className={`text-2xl mb-2 ${s.color}`}>{s.icon}</div>
                            <div className="text-2xl font-black text-gray-800">{s.value}</div>
                            <div className="text-gray-500 text-sm">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { href: '/order', icon: '🧺', label: 'New Order', color: 'gradient-blue text-white' },
                        { href: '/track', icon: '📍', label: 'Track Order', color: 'bg-sky-50 text-sky-700' },
                        { href: '/book', icon: '📅', label: 'Book Machine', color: 'bg-indigo-50 text-indigo-700' },
                        { href: '/', icon: '🏠', label: 'Home', color: 'bg-gray-50 text-gray-700' },
                    ].map((a, i) => (
                        <Link key={i} href={a.href} className={`${a.color} rounded-2xl p-5 text-center card-hover block`}>
                            <div className="text-3xl mb-2">{a.icon}</div>
                            <div className="font-semibold text-sm">{a.label}</div>
                        </Link>
                    ))}
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-3xl shadow-blue-sm border border-blue-50 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
                        <Link href="/order" className="text-primary text-sm font-semibold hover:underline">+ New Order</Link>
                    </div>
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">⏳ Loading...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-5xl mb-4">🧺</div>
                            <p className="text-gray-500 font-medium">No orders yet</p>
                            <Link href="/order" className="btn-primary inline-block mt-4 text-sm py-2 px-6">Place First Order</Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {orders.slice(0, 5).map((order: any) => (
                                <div key={order._id} className="p-5 flex items-center justify-between hover:bg-blue-50/30 transition">
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">Order #{order._id.slice(-6).toUpperCase()}</p>
                                        <p className="text-gray-400 text-xs mt-0.5">{new Date(order.createdAt).toLocaleDateString('th-TH')}</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {order.status}
                                        </span>
                                        <span className="font-bold text-primary">฿{order.totalPrice}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
