"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalShops: 0, totalUsers: 0 });
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'admin') { router.push('/login'); return; }
        Promise.all([
            api.get('/admin/stats').catch(() => ({ data: {} })),
            api.get('/admin/orders').catch(() => ({ data: [] })),
        ]).then(([statsRes, ordersRes]) => {
            setStats(statsRes.data);
            setOrders(ordersRes.data.slice(0, 8));
        }).finally(() => setLoading(false));
    }, []);

    const statusOptions = ['pending', 'processing', 'ready', 'delivered'];
    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        processing: 'bg-blue-100 text-blue-700',
        ready: 'bg-green-100 text-green-700',
        delivered: 'bg-gray-100 text-gray-600',
    };

    const updateStatus = async (id: string, status: string) => {
        await api.put(`/admin/orders/${id}`, { status });
        setOrders(orders.map(o => o._id === id ? { ...o, status } : o));
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F8FAFF]">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">Admin Dashboard</h1>
                        <p className="text-gray-500 mt-1">Manage your laundry business</p>
                    </div>
                    <div className="flex space-x-3">
                        <Link href="/admin/shops/create" className="btn-primary text-sm py-2 px-5">+ New Shop</Link>
                        <Link href="/admin/orders" className="btn-outline text-sm py-2 px-5">All Orders</Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                    {[
                        { icon: '💰', label: 'Total Revenue', value: `฿${(stats.totalRevenue || 0).toLocaleString()}`, color: 'from-green-400 to-emerald-500' },
                        { icon: '📦', label: 'Total Orders', value: stats.totalOrders || 0, color: 'from-blue-400 to-blue-600' },
                        { icon: '🏪', label: 'Branches', value: stats.totalShops || 0, color: 'from-indigo-400 to-indigo-600' },
                        { icon: '👥', label: 'Customers', value: stats.totalUsers || 0, color: 'from-sky-400 to-cyan-500' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-blue-sm border border-blue-50 card-hover">
                            <div className={`w-12 h-12 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-xl mb-3 shadow-md`}>{s.icon}</div>
                            <div className="text-2xl font-black text-gray-800">{s.value}</div>
                            <div className="text-gray-500 text-sm">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Quick Nav */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { href: '/admin/shops', icon: '🏪', label: 'Manage Shops', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                        { href: '/admin/orders', icon: '📋', label: 'All Orders', color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                        { href: '/admin/riders', icon: '🛵', label: 'Riders', color: 'bg-green-50 text-green-700 border-green-100' },
                        { href: '/admin/shops/create', icon: '➕', label: 'Add Shop', color: 'gradient-blue text-white border-transparent' },
                    ].map((a, i) => (
                        <Link key={i} href={a.href} className={`${a.color} border rounded-2xl p-5 text-center card-hover block`}>
                            <div className="text-3xl mb-2">{a.icon}</div>
                            <div className="font-semibold text-sm">{a.label}</div>
                        </Link>
                    ))}
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-3xl shadow-blue-sm border border-blue-50 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
                        <Link href="/admin/orders" className="text-primary text-sm font-semibold hover:underline">View All →</Link>
                    </div>
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">⏳ Loading...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Order ID</th>
                                        <th className="px-6 py-3 text-left">Customer</th>
                                        <th className="px-6 py-3 text-left">Amount</th>
                                        <th className="px-6 py-3 text-left">Status</th>
                                        <th className="px-6 py-3 text-left">Update</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.map((order: any) => (
                                        <tr key={order._id} className="hover:bg-blue-50/30 transition">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-600">#{order._id.slice(-6).toUpperCase()}</td>
                                            <td className="px-6 py-4 text-sm text-gray-800">{order.user?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 font-bold text-primary">฿{order.totalPrice}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select value={order.status} onChange={e => updateStatus(order._id, e.target.value)}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white">
                                                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {orders.length === 0 && (
                                <div className="p-12 text-center text-gray-400">No orders yet</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
