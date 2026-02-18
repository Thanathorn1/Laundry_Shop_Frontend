"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RiderDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const riderName = typeof window !== 'undefined' ? localStorage.getItem('userName') || 'Rider' : 'Rider';

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'rider') { router.push('/login'); return; }
        api.get('/rider/orders').catch(() => ({ data: [] })).then(({ data }) => setOrders(data)).finally(() => setLoading(false));
    }, []);

    const pending = orders.filter(o => o.status === 'ready');
    const completed = orders.filter(o => o.status === 'delivered');

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F8FAFF]">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="gradient-blue rounded-3xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <p className="text-blue-200 text-sm font-medium mb-1">🛵 Rider Dashboard</p>
                        <h1 className="text-3xl font-black">{riderName}</h1>
                        <p className="text-blue-200 mt-1">Ready to deliver!</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { icon: '📦', label: 'Pending Jobs', value: pending.length, color: 'text-orange-500' },
                        { icon: '✅', label: 'Completed', value: completed.length, color: 'text-green-500' },
                        { icon: '📋', label: 'Total', value: orders.length, color: 'text-blue-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-blue-sm border border-blue-50 text-center card-hover">
                            <div className={`text-3xl mb-2 ${s.color}`}>{s.icon}</div>
                            <div className="text-2xl font-black text-gray-800">{s.value}</div>
                            <div className="text-gray-500 text-sm">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Jobs */}
                <div className="bg-white rounded-3xl shadow-blue-sm border border-blue-50 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">Available Jobs</h2>
                        <Link href="/rider/orders" className="text-primary text-sm font-semibold hover:underline">View All →</Link>
                    </div>
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">⏳ Loading jobs...</div>
                    ) : pending.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-5xl mb-4">🎉</div>
                            <p className="text-gray-500 font-medium">No pending deliveries</p>
                            <p className="text-gray-400 text-sm mt-1">Check back later for new jobs</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {pending.map((order: any) => (
                                <div key={order._id} className="p-5 flex items-center justify-between hover:bg-blue-50/30 transition">
                                    <div>
                                        <p className="font-semibold text-gray-800">Order #{order._id.slice(-6).toUpperCase()}</p>
                                        <p className="text-gray-500 text-sm mt-0.5">📍 {order.shop?.address || 'N/A'}</p>
                                        <p className="text-gray-400 text-xs mt-0.5">Customer: {order.user?.name || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-primary text-lg">฿{order.totalPrice}</div>
                                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">Ready</span>
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
