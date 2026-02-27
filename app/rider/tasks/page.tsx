"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import "leaflet/dist/leaflet.css";

// Dynamic imports for Leaflet
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
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

interface Task {
    _id: string;
    productName: string;
    customerName?: string;
    contactPhone: string;
    pickupAddress: string;
    deliveryAddress: string;
    status: 'pending' | 'assigned' | 'picked_up' | 'at_shop' | 'washing' | 'laundry_done' | 'out_for_delivery' | 'completed' | 'cancelled';
    totalPrice: number;
    pickupType?: 'now' | 'schedule';
    pickupLocation?: {
        type: string;
        coordinates: [number, number]; // [lon, lat]
    };
    location?: {
        lat: number;
        lon: number;
    };
    images?: string[];
    description?: string;
    createdAt: string;
}

type Shop = {
    _id: string;
    shopName?: string;
    label?: string;
    totalWashingMachines?: number;
    machineInUse?: number;
    machineAvailable?: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: '⏳' },
    assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '🚴' },
    picked_up: { label: 'Picked Up', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: '📦' },
    at_shop: { label: 'At Shop', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200', icon: '🏪' },
    washing: { label: 'Washing', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200', icon: '🫧' },
    laundry_done: { label: 'Laundry Done', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '🧺' },
    out_for_delivery: { label: 'Out For Delivery', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: '🚚' },
    completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: '✅' },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: '❌' },
};

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [handoverShopByOrderId, setHandoverShopByOrderId] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks();
        fetchShops();
    }, []);

    // Polling fallback: refresh tasks every 5 seconds for real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            fetchTasks();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await apiFetch("/rider/my-tasks");
            setTasks(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const fetchShops = async () => {
        try {
            const data = (await apiFetch('/map/shops')) as Shop[];
            setShops(Array.isArray(data) ? data : []);
        } catch {
            setShops([]);
        }
    };

    const handoverToShop = async (orderId: string) => {
        const shopId = handoverShopByOrderId[orderId];
        if (!shopId) {
            alert('Please select a shop first');
            return;
        }

        setUpdatingId(orderId);
        try {
            await apiFetch(`/rider/handover/${orderId}`, {
                method: 'PATCH',
                body: JSON.stringify({ shopId }),
            });
            await fetchTasks();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to handover to shop');
        } finally {
            setUpdatingId(null);
        }
    };

    const startReturnDelivery = async (orderId: string) => {
        setUpdatingId(orderId);
        try {
            await apiFetch(`/rider/return-delivery/${orderId}`, { method: 'PATCH' });
            await fetchTasks();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to start return delivery');
        } finally {
            setUpdatingId(null);
        }
    };

    const completeDelivery = async (orderId: string) => {
        setUpdatingId(orderId);
        try {
            await apiFetch(`/rider/complete-delivery/${orderId}`, { method: 'PATCH' });
            await fetchTasks();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to complete delivery');
        } finally {
            setUpdatingId(null);
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        if (newStatus === 'pending' && !confirm('คุณแน่ใจหรือไม่ว่าต้องการส่งเป้าคืนสู๋ Dashboard เพื่อให้ไรเดอร์คนอื่นรับต่อ?')) return;
        if (newStatus === 'cancelled' && !confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำสั่งซื้อนี้อย่างถาวร?')) return;

        setUpdatingId(orderId);
        try {
            await apiFetch(`/rider/status/${orderId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
            });
            await fetchTasks();
            if (selectedTask?._id === orderId) {
                const updated = await apiFetch(`/rider/my-tasks`);
                const match = updated.find((t: Task) => t._id === orderId);
                setSelectedTask(match || null);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    // Custom task marker icon (Blue pulse)
    const taskIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        const L = require('leaflet');
        return L.divIcon({
            className: 'custom-task-icon',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute h-8 w-8 rounded-full bg-blue-500/20 animate-ping"></div>
                    <div class="h-5 w-5 rounded-full bg-blue-600 border-2 border-white shadow-xl ring-4 ring-blue-600/10"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
        });
    }, []);

    const activeTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status));

    const mapPos = useMemo(() => {
        if (activeTasks.length > 0) {
            const task = activeTasks[0];
            const lat = task.location?.lat || task.pickupLocation?.coordinates?.[1];
            const lon = task.location?.lon || task.pickupLocation?.coordinates?.[0];
            if (lat && lon) return { center: [lat, lon] as [number, number], zoom: 14 };
        }
        return { center: [13.7563, 100.5018] as [number, number], zoom: 12 };
    }, [activeTasks]);

    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-10 relative min-h-screen flex flex-col max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">My Tasks</h1>
                <p className="text-slate-400 text-sm mt-1">Manage your active and past deliveries</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 flex-1">
                {/* Task List Column */}
                <div className="xl:col-span-2 space-y-4">
                    {activeTasks.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
                            <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
                            <h3 className="text-lg font-bold text-slate-700 mb-1">No active tasks</h3>
                            <p className="text-slate-400 text-sm">Ready to earn? Check available orders!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeTasks.map((task) => {
                                const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
                                return (
                                    <div
                                        key={task._id}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                                    >
                                        {/* Card Header */}
                                        <div className="p-4 sm:p-5">
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg ${cfg.bg} border`}>
                                                        {cfg.icon}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm sm:text-base font-bold text-slate-800 truncate">
                                                            {task.customerName || task.productName || 'Order #' + task._id.slice(-4)}
                                                        </h3>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {new Date(task.createdAt).toLocaleDateString('th-TH', {
                                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${cfg.color} ${cfg.bg}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>

                                            {/* Info row */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    <span className="line-clamp-1">{task.pickupAddress}</span>
                                                </span>
                                                {task.totalPrice > 0 && (
                                                    <span className="flex items-center gap-1 font-semibold text-emerald-600">
                                                        ฿{task.totalPrice}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Actions */}
                                        <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex flex-wrap gap-2">
                                            <button
                                                onClick={() => setSelectedTask(task)}
                                                className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors border border-slate-100"
                                            >
                                                Details
                                            </button>

                                            {task.status === 'assigned' && (
                                                <button
                                                    onClick={() => updateStatus(task._id, 'picked_up')}
                                                    disabled={updatingId === task._id}
                                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    {updatingId === task._id ? '...' : '📦 Pick Up'}
                                                </button>
                                            )}

                                            {task.status === 'picked_up' && (
                                                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                                                    {task.pickupType === 'now' && (
                                                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                                            ⚡ Priority: choose available machine
                                                        </span>
                                                    )}
                                                    <select
                                                        value={handoverShopByOrderId[task._id] || ''}
                                                        onChange={(e) =>
                                                            setHandoverShopByOrderId((prev) => ({
                                                                ...prev,
                                                                [task._id]: e.target.value,
                                                            }))
                                                        }
                                                        className="min-w-[140px] bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                                    >
                                                        <option value="" disabled>Select Shop</option>
                                                        {shops.map((s) => (
                                                            <option
                                                                key={s._id}
                                                                value={s._id}
                                                                disabled={task.pickupType === 'now' && (Number(s.machineAvailable) || 0) <= 0}
                                                            >
                                                                {`${s.shopName || s.label || 'Shop'} (${Number(s.machineAvailable) || 0}/${Number(s.totalWashingMachines) || 10})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => handoverToShop(task._id)}
                                                        disabled={updatingId === task._id}
                                                        className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition-colors shadow-sm disabled:opacity-50"
                                                    >
                                                        {updatingId === task._id ? '...' : '🏪 Send'}
                                                    </button>
                                                </div>
                                            )}

                                            {task.status === 'laundry_done' && (
                                                <button
                                                    onClick={() => startReturnDelivery(task._id)}
                                                    disabled={updatingId === task._id}
                                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    {updatingId === task._id ? '...' : '🚚 Return Delivery'}
                                                </button>
                                            )}

                                            {task.status === 'out_for_delivery' && (
                                                <button
                                                    onClick={() => completeDelivery(task._id)}
                                                    disabled={updatingId === task._id}
                                                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                                                >
                                                    {updatingId === task._id ? '...' : '✅ Complete'}
                                                </button>
                                            )}

                                            {(task.status === 'assigned' || task.status === 'picked_up') && (
                                                <button
                                                    onClick={() => updateStatus(task._id, 'cancelled')}
                                                    disabled={updatingId === task._id}
                                                    className="px-3 py-2 text-rose-500 text-xs font-medium rounded-lg hover:bg-rose-50 transition-colors border border-rose-100 disabled:opacity-50"
                                                >
                                                    {updatingId === task._id ? '...' : 'Cancel'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Past Tasks / History */}
                    {tasks.filter(t => t.status === 'completed').length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
                            <div className="p-4 sm:p-5 border-b border-slate-50">
                                <h3 className="text-base font-bold text-slate-700">Recent History</h3>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {tasks.filter(t => t.status === 'completed').slice(0, 5).map(task => {
                                    const cfg = STATUS_CONFIG[task.status];
                                    return (
                                        <div key={task._id} className="flex items-center justify-between px-4 py-3 sm:px-5 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-9 w-9 flex items-center justify-center bg-emerald-50 rounded-lg text-base shrink-0">
                                                    {cfg.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-semibold text-slate-700 truncate">{task.customerName || task.productName || 'Order #' + task._id.slice(-4)}</h4>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {new Date(task.createdAt).toLocaleDateString('th-TH')} &middot; ฿{task.totalPrice}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${cfg.color} ${cfg.bg}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Map Column */}
                <div className="space-y-4 h-fit xl:sticky xl:top-24">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 h-[300px] sm:h-[400px] xl:h-[500px]">
                        {typeof window !== 'undefined' && (
                            <MapContainer
                                center={mapPos.center}
                                zoom={mapPos.zoom}
                                style={{ height: "100%", width: "100%" }}
                            >
                                <TileLayer
                                    attribution="&copy; OpenStreetMap"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapController center={mapPos.center} zoom={mapPos.zoom} />

                                {activeTasks.map((task) => {
                                    const lat = task.location?.lat || task.pickupLocation?.coordinates?.[1];
                                    const lon = task.location?.lon || task.pickupLocation?.coordinates?.[0];

                                    if (!lat || !lon || !taskIcon) return null;

                                    return (
                                        <Marker key={task._id} position={[lat, lon]} icon={taskIcon}>
                                            <Popup>
                                                <div className="p-2 w-36">
                                                    <p className="font-bold text-slate-800 text-xs mb-1 truncate">
                                                        {task.customerName || task.productName || 'Order #' + task._id.slice(-4)}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 mb-2 line-clamp-2">{task.pickupAddress}</p>
                                                    <button
                                                        onClick={() => setSelectedTask(task)}
                                                        className="w-full bg-blue-600 text-white text-[11px] font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedTask && (() => {
                const modalCfg = STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.assigned;
                return (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between z-10">
                            <div className="min-w-0 mr-3">
                                <h3 className="text-lg font-bold text-slate-800 truncate">{selectedTask.customerName || selectedTask.productName}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">ID: {selectedTask._id.slice(-8)}</p>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-400 transition-colors shrink-0">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Status badge */}
                            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${modalCfg.bg}`}>
                                <span className="text-base">{modalCfg.icon}</span>
                                <span className={`text-sm font-semibold ${modalCfg.color}`}>{modalCfg.label}</span>
                                <span className="ml-auto text-lg font-bold text-slate-800">฿{selectedTask.totalPrice}</span>
                            </div>

                            {/* Info sections */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Customer Contact</label>
                                    <p className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-2">
                                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {selectedTask.contactPhone || 'No phone provided'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pickup Location</label>
                                    <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-sm text-slate-600 leading-relaxed">{selectedTask.pickupAddress}</p>
                                    </div>
                                </div>

                                {selectedTask.description && (
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Notes</label>
                                        <p className="text-sm text-slate-500 mt-1 italic">{selectedTask.description}</p>
                                    </div>
                                )}

                                {selectedTask.images && selectedTask.images.length > 0 && (
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Photos</label>
                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            {selectedTask.images.map((img, i) => (
                                                <img key={i} src={`${API_BASE_URL}${img}`} alt="Basket" className="h-20 w-full object-cover rounded-xl border border-slate-200" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex flex-col gap-2">
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                            >
                                Close
                            </button>
                            {['assigned', 'picked_up'].includes(selectedTask.status) && (
                                <>
                                    <button
                                        onClick={() => updateStatus(selectedTask._id, 'pending')}
                                        disabled={updatingId === selectedTask._id}
                                        className="w-full py-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-all disabled:opacity-50"
                                    >
                                        {updatingId === selectedTask._id ? '...' : 'Return Task to Dashboard'}
                                    </button>
                                    <button
                                        onClick={() => updateStatus(selectedTask._id, 'cancelled')}
                                        disabled={updatingId === selectedTask._id}
                                        className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-all disabled:opacity-50"
                                    >
                                        {updatingId === selectedTask._id ? '...' : 'Cancel Order'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}

const styles = `
  .custom-task-icon {
    background: transparent;
    border: none;
  }
`;
