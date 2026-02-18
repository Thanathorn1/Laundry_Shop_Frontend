"use client";
import { useState } from 'react';
import api from '@/lib/api';

export default function TrackPage() {
    const [query, setQuery] = useState('');
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // In a real app, we need a specific tracking endpoint or we can search by ID
            // For this demo, we'll assume the query is the order ID
            const { data } = await api.get(`/orders/track/${query}`);
            setOrder(data);
        } catch (err: any) {
            setError('Order not found. Please check your order ID or phone number.');
            setOrder(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-xl mx-auto py-20 px-4">
                <h1 className="text-4xl font-bold text-center text-primary mb-10">Track Your Order</h1>
                <form onSubmit={handleTrack} className="flex space-x-2 mb-10">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter Order ID or Phone Number"
                        className="flex-1 p-4 border rounded-lg focus:ring-primary shadow-sm"
                    />
                    <button
                        type="submit"
                        className="px-8 py-4 bg-primary text-white rounded-lg font-bold hover:bg-secondary transition shadow-md"
                        disabled={loading}
                    >
                        {loading ? 'Searching...' : 'Track'}
                    </button>
                </form>

                {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

                {order && (
                    <div className="p-8 bg-gray-50 rounded-2xl border-2 border-primary shadow-lg animate-fade-in">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Order #{order._id.slice(-6)}</h2>
                                <p className="text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-4 py-2 font-bold rounded-full ${order.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {order.status}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-600">Services</span>
                                <span className="font-medium">{order.services.map((s: any) => s.type).join(', ')}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-600">Branch</span>
                                <span className="font-medium text-primary">Main Branch (Mock)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payment Status</span>
                                <span className={`font-bold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                    {order.paymentStatus.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {order.status === 'Done' && (
                            <div className="mt-8 p-4 bg-white rounded-lg text-center border-2 border-dashed border-gray-300">
                                <p className="text-sm text-gray-500 mb-2">Ready for collection! Scan this code at the counter:</p>
                                <div className="w-32 h-32 bg-gray-100 mx-auto flex items-center justify-center">
                                    <span className="text-xs text-gray-400 font-mono">PICKUP CODE QR</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
