"use client";

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/api';
import 'leaflet/dist/leaflet.css';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);
const MapController = dynamic(
    () => import('react-leaflet').then((mod) => {
        const { useMap } = mod;
        return function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
            const map = useMap();
            useEffect(() => {
                map.setView(center, zoom);
            }, [center, zoom, map]);
            return null;
        };
    }),
    { ssr: false }
);

interface Order {
    _id: string;
    customerName: string;
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    totalPrice: number;
    location?: {
        lat: number;
        lon: number;
    };
    distance?: number;
}

export default function RiderDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [maxDistance, setMaxDistance] = useState<number>(0);
    const [mapView, setMapView] = useState<{ center: [number, number], zoom: number }>({
        center: [13.7563, 100.5018], // Default Bangkok
        zoom: 13
    });

    // Fix for Leaflet default icons in Next.js
    const icon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const L = require('leaflet');
        return L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    }, []);

    // Custom CSS-based rider icon (Blue dot with white border)
    const riderIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const L = require('leaflet');
        return L.divIcon({
            className: 'custom-rider-icon',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute h-6 w-6 rounded-full bg-blue-500/20 animate-ping"></div>
                    <div class="h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-lg ring-2 ring-blue-600/20"></div>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
    }, []);

    useEffect(() => {
        fetchOrders();

        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    setUserLocation(coords);
                    // Only auto-center on first load to avoid disrupting user interaction
                    if (!userLocation) {
                        setMapView({ center: [coords.lat, coords.lon], zoom: 13 });
                    }
                },
                (err) => console.error("Geolocation error:", err),
                { enableHighAccuracy: true }
            );
        }

        return () => {
            if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/rider/available');
            setOrders(data);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!orders.length) {
            setFilteredOrders([]);
            return;
        }

        const updated = orders
            .map((order: any) => {
                const lat = order.pickupLocation?.coordinates?.[1];
                const lon = order.pickupLocation?.coordinates?.[0];

                if (!lat || !lon) return null;

                let distance = 0;

                if (userLocation) {
                    distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lon,
                        lat,
                        lon
                    );
                }

                return {
                    ...order,
                    location: { lat, lon },
                    distance: parseFloat(distance.toFixed(1))
                };
            })
            .filter(Boolean);

        const filtered = updated.filter(
            (order: any) =>
                maxDistance === 0 ||
                (order.distance !== undefined && order.distance <= maxDistance)
        );

        setFilteredOrders(filtered);
    }, [orders, userLocation, maxDistance]);

    const acceptOrder = async (orderId: string) => {
        try {
            await apiFetch(`/rider/accept/${orderId}`, { method: 'PATCH' });
            alert('Order accepted successfully!');
            fetchOrders();
        } catch (err: any) {
            alert(err.message);
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
        <div className="relative h-screen w-full overflow-hidden bg-slate-50">
            {/* MapContainer - Client Only */}
            <div className="absolute inset-0 z-0 h-full w-full">
                {typeof window !== 'undefined' && (
                    <MapContainer
                        center={mapView.center}
                        zoom={mapView.zoom}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapController center={mapView.center} zoom={mapView.zoom} />

                        {userLocation && riderIcon && (
                            <Marker position={[userLocation.lat, userLocation.lon]} icon={riderIcon}>
                                <Popup>
                                    <div className="p-2">
                                        <p className="font-black text-blue-600 text-xs uppercase tracking-widest">Your Location</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {filteredOrders.map((order) => (
                            order.location && icon && (
                                <Marker
                                    key={order._id}
                                    position={[order.location.lat, order.location.lon]}
                                    icon={icon}
                                >
                                    <Popup>
                                        <div className="p-3 w-48">
                                            <p className="font-black text-blue-900 text-sm mb-1">{order.customerName}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mb-2 line-clamp-2">{order.pickupAddress}</p>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">฿{order.totalPrice}</span>
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">{order.distance} km</span>
                                            </div>
                                            <button
                                                onClick={() => acceptOrder(order._id)}
                                                className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 uppercase tracking-widest"
                                            >
                                                Accept Order
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                        ))}
                    </MapContainer>
                )}
            </div>

            {/* Top Bar - Floating Layer */}
            <div className="absolute top-6 left-6 right-6 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-none text-blue-900">
                <div className="pointer-events-auto">
                    <div className="bg-white/90 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl shadow-blue-900/10 border border-white/50 flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <span className="text-white text-xl">📦</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-blue-900 leading-none">Available Jobs</h1>
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Real-time Updates</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="bg-white/90 backdrop-blur-xl px-2 py-2 rounded-2xl shadow-2xl shadow-blue-900/10 border border-white/50 flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2">Range</span>
                        <select
                            value={maxDistance}
                            onChange={(e) => setMaxDistance(Number(e.target.value))}
                            className="bg-blue-50 text-blue-900 text-[10px] font-black px-3 py-1.5 rounded-xl border border-blue-100 focus:outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                            <option value={5}>5 KM</option>
                            <option value={10}>10 KM</option>
                            <option value={20}>20 KM</option>
                            <option value={50}>50 KM</option>
                            <option value={0}>∞ ALL</option>
                        </select>
                    </div>

                    {userLocation && (
                        <div className="bg-blue-600 px-4 py-2.5 rounded-2xl shadow-xl shadow-blue-200 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></div>
                            <span className="text-[9px] text-white font-black uppercase tracking-widest">GPS Active</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Side Panel - Floating Order List */}
            <div className="absolute top-32 bottom-6 left-6 w-84 z-20 pointer-events-none flex flex-col gap-4 text-blue-900">
                <div className="pointer-events-auto flex-1 flex flex-col min-h-0">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white/50 overflow-hidden flex flex-col h-full ring-1 ring-black/[0.02]">
                        <div className="p-6 pb-4 border-b border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em]">Nearby Orders</span>
                            <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100">
                                {filteredOrders.length} Found
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {filteredOrders.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl border border-slate-100">🔭</div>
                                    <div>
                                        <p className="text-sm font-black text-blue-900">No Jobs Nearby</p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Try increasing the range</p>
                                    </div>
                                </div>
                            ) : (
                                filteredOrders.map((order: Order) => (
                                    <div
                                        key={order._id}
                                        className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group cursor-pointer active:scale-[0.98]"
                                        onClick={() => {
                                            if (order.location) {
                                                setMapView({ center: [order.location.lat, order.location.lon], zoom: 16 });
                                            }
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 pr-2">
                                                <h3 className="text-sm font-black text-blue-900 line-clamp-1">{order.customerName}</h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                                                        {order.distance} km
                                                    </span>
                                                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                                        ฿{order.totalPrice}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    acceptOrder(order._id);
                                                }}
                                                className="bg-blue-600 text-[10px] font-black text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                                            >
                                                Take
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-start gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0"></div>
                                                <p className="text-[10px] font-bold text-slate-500 line-clamp-1">{order.pickupAddress}</p>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-sky-300 mt-1 flex-shrink-0"></div>
                                                <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{order.deliveryAddress}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                .leaflet-container {
                    background: #f8fafc;
                }
                .leaflet-bottom.leaflet-right {
                    display: none;
                }
            `}</style>
        </div>
    );
}
