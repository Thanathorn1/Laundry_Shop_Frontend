"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RiderOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'rider') { router.push('/login'); return; }
        api.get('/rider/orders').catch(() => ({ data: [] })).then(({ data }) => setOrders(data)).finally(() => setLoading(false));
    }, []);

    const updateStatus = async (id: string, status: string) => {
        await api.put(`/rider/orders/${id}`, { status });
        setOrders(orders.map(o => o._id === id ? { ...o, status } : o));
    };

    const statusColors: Record<string, string> = {
        ready: 'bg-green-100 text-green-700',
        delivered: 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F8FAFF]">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800">My Deliveries</h1>
                    <p className="text-gray-500 mt-1">Manage your assigned orders</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">⏳ Loading...</div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-blue-sm border border-blue-50 p-16 text-center">
                        <div className="text-6xl mb-4">🛵</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No Deliveries Yet</h3>
                        <p className="text-gray-500">Orders assigned to you will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order: any) => (
                            <div key={order._id} className="bg-white rounded-2xl p-6 shadow-blue-sm border border-blue-50 card-hover">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-3">
                                            <h3 className="font-bold text-gray-800">Order #{order._id.slice(-6).toUpperCase()}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || 'bg-blue-100 text-blue-700'}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                                            <div>👤 <span className="font-medium">{order.user?.name || 'N/A'}</span></div>
                                            <div>📞 <span className="font-medium">{order.user?.phone || 'N/A'}</span></div>
                                            <div>🏪 <span className="font-medium">{order.shop?.name || 'N/A'}</span></div>
                                            <div>📍 <span className="font-medium">{order.shop?.address || 'N/A'}</span></div>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="text-2xl font-black text-primary">฿{order.totalPrice}</div>
                                    </div>
                                </div>

                                {order.status === 'ready' && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button onClick={() => updateStatus(order._id, 'delivered')}
                                            className="w-full btn-primary py-3 text-sm">
                                            ✅ Mark as Delivered
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
