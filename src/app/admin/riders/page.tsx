"use client";
import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Rider {
    _id: string;
    name: string;
    email: string;
    phone: string;
    riderStatus: string;
    createdAt: string;
}

export default function RiderApprovalPage() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPendingRiders();
    }, []);

    const fetchPendingRiders = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/riders/pending');
            setRiders(data);
        } catch (err: any) {
            setError('Failed to fetch pending riders');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            await api.put(`/admin/riders/${id}/${action}`);
            setRiders(riders.filter(r => r._id !== id));
            alert(`Rider ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        } catch (err: any) {
            alert('Failed to process request');
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 bg-[#F8FAFF]">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">Rider Approval</h1>
                        <p className="text-gray-500">Manage pending rider applications</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100">{error}</div>
                ) : riders.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-blue-50 shadow-blue-sm">
                        <div className="text-5xl mb-4">✅</div>
                        <h3 className="text-xl font-bold text-gray-800">No pending riders</h3>
                        <p className="text-gray-500">All rider applications have been processed.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl overflow-hidden shadow-blue-sm border border-blue-50">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-blue-50">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase">Rider Info</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase">Contact</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase">Applied Date</th>
                                    <th className="px-6 py-4 text-sm font-bold text-gray-700 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-50">
                                {riders.map((rider) => (
                                    <tr key={rider._id} className="hover:bg-blue-50/30 transition">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{rider.name}</div>
                                            <div className="text-xs text-gray-500">{rider.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700">{rider.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-500">{new Date(rider.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => handleAction(rider._id, 'approve')}
                                                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(rider._id, 'reject')}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
