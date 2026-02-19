"use client";

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import LongdoMap from '@/components/LongdoMap';

interface Order {
    _id: string;
    customerName: string;
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    totalPrice: number;
}

export default function RiderDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        fetchOrders();
        getCurrentLocation();
    }, []);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (err) => console.error("Geolocation error:", err)
            );
        }
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/rider/available');
            setOrders(data);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    const acceptOrder = async (orderId: string) => {
        try {
            await apiFetch(`/rider/accept/${orderId}`, { method: 'PATCH' });
            fetchOrders();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const onMapLoad = (map: any) => {
        mapRef.current = map;
        // Add markers for orders (using mock coordinates for now as requested)
        orders.forEach((order: Order) => {
            // Mocking coordinates near center of Bangkok for demo
            const mockLat = 13.7563 + (Math.random() - 0.5) * 0.1;
            const mockLon = 100.5018 + (Math.random() - 0.5) * 0.1;

            map.Overlays.add(new window.longdo.Marker({ lat: mockLat, lon: mockLon }, {
                title: order.customerName,
                detail: order.pickupAddress
            }));
        });

        if (userLocation) {
            map.location(userLocation);
            map.Overlays.add(new window.longdo.Marker(userLocation, {
                icon: {
                    url: 'https://map.longdo.com/mmmap/images/pin_mark.png'
                },
                title: 'Your Location'
            }));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">กำลังโหลดงานล่าสุด...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-rose-100/50 border border-rose-50 text-center">
            <div className="h-20 w-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">⚠️</div>
            <h2 className="text-2xl font-black text-blue-900 mb-4 tracking-tight">ไม่ได้รับอนุญาต</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                ขออภัย บัญชีของคุณอาจไม่มีสิทธิ์เข้าถึงหน้านี้ หรือเซสชันหมดอายุแล้ว
                <br /><span className="text-rose-500 text-xs font-bold mt-2 block">Error: {error}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100"
                >
                    ลองใหม่อีกครั้ง
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }}
                    className="px-8 py-4 bg-slate-50 text-blue-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                >
                    กลับไปหน้าล็อกอิน
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-blue-900 tracking-tight">Available Orders</h1>
                    <p className="text-blue-700/60 text-sm font-medium">Find laundry tasks nearby and start earning.</p>
                </div>
                {userLocation && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 group">
                        <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-[10px] text-blue-700 font-black uppercase tracking-widest">GPS Active</span>
                    </div>
                )}
            </div>

            <div className="h-[450px] w-full overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl shadow-slate-200/50 relative">
                <LongdoMap id="rider-map" callback={onMapLoad} />
                <div className="absolute top-4 right-4 z-10">
                    {/* Add Map Controls if needed */}
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-lg">No orders available at the moment.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {orders.map((order: Order) => (
                        <div key={order._id} className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-blue-600/5 transition-colors"></div>

                            <div className="relative">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-lg font-black text-blue-900 leading-tight">{order.customerName}</h3>
                                    <span className="px-3 py-1 bg-blue-600 text-[10px] font-black text-white rounded-full shadow-lg shadow-blue-200 uppercase tracking-tighter">Fast</span>
                                </div>
                                <div className="space-y-3 mb-6">
                                    <div className="text-xs text-blue-400 font-bold flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-blue-600">Pickup</span>
                                        <span className="text-blue-900 line-clamp-2">{order.pickupAddress}</span>
                                    </div>
                                    <div className="text-xs text-blue-400 font-bold flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-widest text-sky-500">Delivery</span>
                                        <span className="text-blue-900 line-clamp-2">{order.deliveryAddress}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50 relative">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider">Earnings</span>
                                    <span className="text-2xl font-black text-blue-900">฿{order.totalPrice}</span>
                                </div>
                                <button
                                    onClick={() => acceptOrder(order._id)}
                                    className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100 hover:shadow-blue-200"
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
