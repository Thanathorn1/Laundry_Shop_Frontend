"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-gray-100 text-gray-600',
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'admin') { router.push('/login'); return; }
        api.get('/admin/orders').then(({ data }) => setOrders(data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const updateStatus = async (id: string, status: string) => {
        await api.put(`/admin/orders/${id}`, { status });
        setOrders(orders.map(o => o._id === id ? { ...o, status } : o));
    };

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F8FAFF]">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">All Orders</h1>
                        <p className="text-gray-500 mt-1">{orders.length} total orders</p>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="flex space-x-2 mb-6 bg-white p-2 rounded-2xl shadow-blue-sm border border-blue-50 w-fit">
                    {['all', 'pending', 'processing', 'ready', 'delivered'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition capitalize ${filter === f ? 'gradient-blue text-white shadow-md' : 'text-gray-500 hover:text-primary'}`}>
                            {f}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-blue-sm border border-blue-50 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400">⏳ Loading orders...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Order ID</th>
                                        <th className="px-6 py-4 text-left">Customer</th>
                                        <th className="px-6 py-4 text-left">Branch</th>
                                        <th className="px-6 py-4 text-left">Amount</th>
                                        <th className="px-6 py-4 text-left">Payment</th>
                                        <th className="px-6 py-4 text-left">Status</th>
                                        <th className="px-6 py-4 text-left">Update</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((order: any) => (
                                        <tr key={order._id} className="hover:bg-blue-50/30 transition">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-600">#{order._id.slice(-6).toUpperCase()}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-800">{order.user?.name || 'N/A'}</div>
                                                <div className="text-xs text-gray-400">{order.user?.phone || ''}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{order.shop?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 font-bold text-primary">฿{order.totalPrice}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                    {order.paymentStatus || 'unpaid'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select value={order.status} onChange={e => updateStatus(order._id, e.target.value)}
                                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:border-primary">
                                                    {['pending', 'processing', 'ready', 'delivered'].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="p-12 text-center text-gray-400">No orders found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
