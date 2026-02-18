"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ShopManager() {
    const [shops, setShops] = useState([]);

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        const res = await fetch(`${API_URL}/shops`);
        const data = await res.json();
        setShops(data);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this shop?')) return;
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/shops/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        fetchShops();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-900">Branch Management</h1>
                        <p className="text-gray-500 mt-1">Manage all laundry shop branches</p>
                    </div>
                    <Link
                        href="/admin/shops/create"
                        className="px-6 py-3 bg-blue-900 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md"
                    >
                        + Add New Shop
                    </Link>
                </div>

                {shops.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 text-lg">No shops yet.</p>
                        <Link href="/admin/shops/create" className="mt-4 inline-block text-blue-600 underline">
                            Create your first shop
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {shops.map((shop: any) => (
                            <div key={shop._id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition">
                                {shop.image && (
                                    <img
                                        src={`http://localhost:5000${shop.image}`}
                                        alt={shop.name}
                                        className="w-full h-48 object-cover"
                                    />
                                )}
                                {!shop.image && (
                                    <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                                        <span className="text-blue-400 text-4xl">🏪</span>
                                    </div>
                                )}
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-blue-900">{shop.name}</h3>
                                    <p className="text-gray-500 text-sm mt-1">{shop.address}</p>
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                        <span>📞 {shop.phone}</span>
                                        <span>🕐 {shop.openHours}</span>
                                    </div>
                                    {shop.location && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            📍 {shop.location.lat}, {shop.location.lng}
                                        </p>
                                    )}
                                    <div className="flex gap-3 mt-4">
                                        <Link
                                            href={`/admin/shops/create?id=${shop._id}`}
                                            className="flex-1 text-center py-2 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(shop._id)}
                                            className="flex-1 py-2 border border-red-400 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition"
                                        >
                                            Delete
                                        </button>
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
