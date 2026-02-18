"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminRidersPage() {
    const [riders, setRiders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        if (role !== 'admin') { router.push('/login'); return; }
        api.get('/admin/riders').catch(() => ({ data: [] })).then(({ data }) => setRiders(data)).finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F8FAFF]">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800">Riders</h1>
                    <p className="text-gray-500 mt-1">Manage your delivery team</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-400">⏳ Loading...</div>
                ) : riders.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-blue-sm border border-blue-50 p-16 text-center">
                        <div className="text-6xl mb-4">🛵</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">No Riders Yet</h3>
                        <p className="text-gray-500">Riders will appear here once they register with the rider role.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {riders.map((rider: any) => (
                            <div key={rider._id} className="bg-white rounded-2xl p-6 shadow-blue-sm border border-blue-50 card-hover">
                                <div className="flex items-center space-x-4 mb-4">
                                    <div className="w-12 h-12 gradient-blue rounded-xl flex items-center justify-center text-xl shadow-blue-sm">🛵</div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{rider.name}</h3>
                                        <span className="badge-rider text-xs">Rider</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center space-x-2">
                                        <span>📧</span><span>{rider.email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span>📞</span><span>{rider.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
