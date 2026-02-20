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
        <div className="h-screen w-full relative bg-slate-100">
            <div ref={mapContainerRef} className="h-full w-full" />

            <div className="absolute left-6 top-6 z-[500] rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
                <h1 className="text-2xl font-black text-blue-900 tracking-tight">Available Orders</h1>
                <p className="text-blue-700/60 text-xs font-semibold">{orders.length} orders • {shops.length} shops nearby</p>
            </div>

            {userLocation && (
                <div className="absolute right-6 top-6 z-[500] flex items-center gap-2 rounded-full border border-blue-100 bg-white/95 px-4 py-2 shadow backdrop-blur">
                    <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">GPS Active</span>
                </div>
            )}
        </div>
    );
}
