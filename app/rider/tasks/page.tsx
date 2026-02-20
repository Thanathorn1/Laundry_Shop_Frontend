"use client";

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';

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

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018];

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

interface Task {
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
    location?: { coordinates: number[] };
}

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shops, setShops] = useState<Shop[]>([]);
    const [selectedShopId, setSelectedShopId] = useState<string>('');
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const leafletRef = useRef<LeafletLib | null>(null);
    const markersRef = useRef<LeafletMarker[]>([]);

    useEffect(() => {
        fetchTasks();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const data = await apiFetch(`/map/shops/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}&maxDistanceKm=12`);
                    if (Array.isArray(data)) {
                        setShops(data as Shop[]);
                        if (data.length > 0 && data[0]?._id) {
                            setSelectedShopId(data[0]._id);
                        }
                    }
                } catch {
                }
            });
        }
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await apiFetch('/rider/my-tasks');
            setTasks(data);
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

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            await apiFetch(`/rider/status/${orderId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            fetchTasks();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const handoverToShop = async (orderId: string) => {
        if (!selectedShopId) {
            alert('Please select a shop first');
            return;
        }
        try {
            await apiFetch(`/rider/handover/${orderId}`, {
                method: 'PATCH',
                body: JSON.stringify({ shopId: selectedShopId }),
            });
            fetchTasks();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    const startReturnDelivery = async (orderId: string) => {
        try {
            await apiFetch(`/rider/return-delivery/${orderId}`, { method: 'PATCH' });
            fetchTasks();
        } catch (err: unknown) {
            if (err instanceof Error) {
                alert(err.message);
            }
        }
    };

    useEffect(() => {
        if (loading || tasks.length === 0) return;
        let mounted = true;

        const setupMap = async () => {
            const L = await loadLeaflet();
            if (!mounted || !L || !mapContainerRef.current || mapRef.current) return;

            leafletRef.current = L;
            const map = L.map(mapContainerRef.current, {
                center: DEFAULT_CENTER,
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
            markersRef.current.forEach((marker) => marker.remove());
            markersRef.current = [];
            if (mapRef.current) mapRef.current.remove();
            mapRef.current = null;
        };
    }, [loading, tasks.length]);

    useEffect(() => {
        const map = mapRef.current;
        const L = leafletRef.current;
        if (!map || !L) return;

        setTimeout(() => {
            map.invalidateSize();
        }, 0);

        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];

        tasks.forEach((task: Task, index) => {
            const mockLat = DEFAULT_CENTER[0] + (((index % 5) - 2) * 0.01);
            const mockLng = DEFAULT_CENTER[1] + ((Math.floor(index / 5) - 1) * 0.01);

            const marker = L.marker([mockLat, mockLng])
                .bindPopup(`<b>${task.customerName}</b><br/>${task.pickupAddress || '-'}`)
                .addTo(map);
            markersRef.current.push(marker);

            if (index === 0) {
                map.setView([mockLat, mockLng], 14);
            }
        });
    }, [tasks]);

    if (loading) return <div className="text-zinc-600 dark:text-zinc-400">Loading your tasks...</div>;
    if (error) return <div className="text-rose-600 dark:text-rose-400">Error: {error}</div>;

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-black text-blue-900 tracking-tight">My Tasks</h1>
                <p className="text-blue-700/60 text-sm font-medium">Manage your active deliveries and update statuses.</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-blue-300">Target Shop (for handover)</label>
                <select
                    className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-900 outline-none focus:border-blue-500"
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                >
                    {shops.length === 0 && <option value="">No nearby shop found</option>}
                    {shops.map((shop) => (
                        <option key={shop._id} value={shop._id}>{shop.shopName || shop.label || shop._id}</option>
                    ))}
                </select>
            </div>

            {tasks.length > 0 && (
                <div className="h-[350px] w-full overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl shadow-slate-200/50">
                    <div ref={mapContainerRef} className="h-full w-full" />
                </div>
            )}

            {tasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
                    <p className="text-slate-400 font-bold text-lg">You have no active tasks.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {tasks.map((task: Task) => (
                        <div key={task._id} className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-blue-900">{task.customerName}</h3>
                                    <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${task.status === 'delivered'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                        }`}>
                                        {task.status}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">Total Pay</span>
                                    <span className="text-2xl font-black text-blue-900 leading-none">฿{task.totalPrice}</span>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6 mb-8">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-2">Pickup Address</span>
                                    <span className="text-sm font-bold text-blue-900">{task.pickupAddress}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100">
                                    <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block mb-2">Delivery Address</span>
                                    <span className="text-sm font-bold text-blue-900">{task.deliveryAddress}</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-50 pt-6">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-2 block">Update Delivery Status</label>
                                    <select
                                        className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                                        value={task.status}
                                        onChange={(e) => updateStatus(task._id, e.target.value)}
                                    >
                                        <option value="accepted">Order Accepted</option>
                                        <option value="picked-up">Picked Up (Wash/Dry)</option>
                                        <option value="at_shop">At Shop</option>
                                        <option value="washing">Washing</option>
                                        <option value="laundry_done">Laundry Done</option>
                                        <option value="out_for_delivery">Out for Delivery</option>
                                        <option value="delivered">Delivered to Customer</option>
                                    </select>
                                </div>
                                <div className="sm:self-end flex flex-wrap gap-2">
                                    {(task.status === 'picked_up' || task.status === 'picked-up') && (
                                        <button
                                            onClick={() => handoverToShop(task._id)}
                                            className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100 transition-all"
                                        >
                                            Send to Shop
                                        </button>
                                    )}
                                    {task.status === 'laundry_done' && (
                                        <button
                                            onClick={() => startReturnDelivery(task._id)}
                                            className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100 transition-all"
                                        >
                                            Deliver Back
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกงานนี้?')) {
                                                updateStatus(task._id, 'cancelled');
                                            }
                                        }}
                                        className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-all"
                                    >
                                        Cancel Task
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
