"use client";

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';

type LatLng = { lat: number; lng: number };

type LeafletMarker = {
    addTo: (map: LeafletMap) => LeafletMarker;
    bindPopup: (content: string) => LeafletMarker;
    remove: () => void;
};

type LeafletMap = {
    setView: (center: [number, number], zoom: number) => void;
    invalidateSize: () => void;
    remove: () => void;
};

type LeafletLib = {
    map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap;
    tileLayer: (url: string, options: { maxZoom: number }) => { addTo: (map: LeafletMap) => void };
    marker: (latLng: [number, number]) => LeafletMarker;
};

const DEFAULT_CENTER: LatLng = { lat: 13.7563, lng: 100.5018 };

async function loadLeaflet() {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { L?: LeafletLib };
    if (w.L) return w.L;

    if (!document.querySelector('link[data-leaflet="true"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        css.setAttribute('data-leaflet', 'true');
        document.head.appendChild(css);
    }

    await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
        if (existing) {
            if ((window as any).L) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load leaflet')));
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.setAttribute('data-leaflet', 'true');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load leaflet'));
        document.body.appendChild(script);
    });

    return (window as unknown as { L?: LeafletLib }).L ?? null;
}

interface Order {
    _id: string;
    customerName: string;
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    totalPrice: number;
}

interface Shop {
    _id: string;
    shopName?: string;
    label?: string;
    phoneNumber?: string;
    photoImage?: string;
    distanceKm?: number | null;
    location?: {
        type: string;
        coordinates: number[];
    };
}

export default function RiderDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [shops, setShops] = useState<Shop[]>([]);
    const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const leafletRef = useRef<LeafletLib | null>(null);
    const orderMarkersRef = useRef<LeafletMarker[]>([]);
    const shopMarkersRef = useRef<LeafletMarker[]>([]);
    const selectedMarkerRef = useRef<LeafletMarker | null>(null);

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
                        lng: position.coords.longitude
                    });
                    fetchNearbyShops(position.coords.latitude, position.coords.longitude);
                },
                (err) => console.error("Geolocation error:", err)
            );
        }
    };

    const fetchNearbyShops = async (lat: number, lon: number) => {
        try {
            const data = await apiFetch(`/map/shops/nearby?lat=${lat}&lng=${lon}&maxDistanceKm=8`);
            setShops(Array.isArray(data) ? data : []);
        } catch {
            setShops([]);
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

    useEffect(() => {
        if (loading) return;
        let mounted = true;

        const setupMap = async () => {
            const L = await loadLeaflet();
            if (!mounted || !L || !mapContainerRef.current || mapRef.current) return;

            leafletRef.current = L;
            const map = L.map(mapContainerRef.current, {
                center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
                zoom: 13,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            mapRef.current = map;
            setTimeout(() => {
                map.invalidateSize();
            }, 50);
        };

        setupMap();

        return () => {
            mounted = false;
            orderMarkersRef.current.forEach((marker) => marker.remove());
            shopMarkersRef.current.forEach((marker) => marker.remove());
            selectedMarkerRef.current?.remove();
            orderMarkersRef.current = [];
            shopMarkersRef.current = [];
            selectedMarkerRef.current = null;
            if (mapRef.current) mapRef.current.remove();
            mapRef.current = null;
        };
    }, [loading]);

    useEffect(() => {
        const map = mapRef.current;
        const L = leafletRef.current;
        if (!map || !L) return;

        setTimeout(() => {
            map.invalidateSize();
        }, 0);

        orderMarkersRef.current.forEach((marker) => marker.remove());
        shopMarkersRef.current.forEach((marker) => marker.remove());
        orderMarkersRef.current = [];
        shopMarkersRef.current = [];

        orders.forEach((order: Order, index) => {
            const mockLat = DEFAULT_CENTER.lat + (((index % 5) - 2) * 0.01);
            const mockLng = DEFAULT_CENTER.lng + ((Math.floor(index / 5) - 1) * 0.01);
            const marker = L.marker([mockLat, mockLng])
                .bindPopup(`<b>${order.customerName}</b><br/>${order.pickupAddress || '-'}`)
                .addTo(map);
            orderMarkersRef.current.push(marker);
        });

        if (userLocation) {
            const marker = L.marker([userLocation.lat, userLocation.lng])
                .bindPopup('<b>Your Location</b>')
                .addTo(map);
            orderMarkersRef.current.push(marker);
            map.setView([userLocation.lat, userLocation.lng], 14);
        }

        shops.forEach((shop) => {
            const coords = shop.location?.coordinates;
            if (!Array.isArray(coords) || coords.length < 2) return;

            const marker = L.marker([coords[1], coords[0]])
                .bindPopup(`<b>${shop.shopName || shop.label || 'Laundry Shop'}</b><br/>${shop.phoneNumber || '-'}`)
                .addTo(map);
            shopMarkersRef.current.push(marker);
        });
    }, [orders, shops, userLocation]);

    const chooseShop = (shop: Shop) => {
        setSelectedShopId(shop._id);
        const coords = shop.location?.coordinates;
        const map = mapRef.current;
        const L = leafletRef.current;
        if (!map || !L || !Array.isArray(coords) || coords.length < 2) return;

        selectedMarkerRef.current?.remove();
        selectedMarkerRef.current = L.marker([coords[1], coords[0]])
            .bindPopup(`<b>${shop.shopName || shop.label || 'Selected Shop'}</b><br/>${shop.phoneNumber || '-'}`)
            .addTo(map);
        map.setView([coords[1], coords[0]], 15);
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
                <div ref={mapContainerRef} className="h-full w-full" />
                <div className="absolute top-4 right-4 z-10">
                    {/* Add Map Controls if needed */}
                </div>
            </div>

            <div className="rounded-3xl border border-white bg-white p-6 shadow-xl shadow-blue-100/30">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black text-blue-900">Nearby Laundry Shops</h2>
                    <span className="text-xs font-black uppercase tracking-widest text-blue-400">{shops.length} shops</span>
                </div>

                {shops.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-700/70">No nearby pinned shop yet.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {shops.map((shop) => (
                            <div key={shop._id} className={`rounded-2xl border p-4 ${selectedShopId === shop._id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-white'}`}>
                                {shop.photoImage ? (
                                    <img src={shop.photoImage} alt={shop.shopName || 'Shop'} className="mb-3 h-28 w-full rounded-xl object-cover" />
                                ) : (
                                    <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-100 text-3xl">🏬</div>
                                )}
                                <h3 className="text-sm font-black text-blue-900">{shop.shopName || shop.label || 'Laundry Shop'}</h3>
                                <p className="mt-1 text-xs font-semibold text-blue-600">☎ {shop.phoneNumber || '-'}</p>
                                <p className="mt-1 text-xs font-semibold text-blue-500">{shop.distanceKm != null ? `${shop.distanceKm.toFixed(2)} km away` : '-'}</p>
                                <button
                                    onClick={() => chooseShop(shop)}
                                    className="mt-3 w-full rounded-xl border border-blue-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700 hover:bg-blue-100"
                                >
                                    {selectedShopId === shop._id ? 'Selected' : 'Choose Shop'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
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
