"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
    Sparkles,
    Ticket,
    Truck,
    CheckCircle,
    Package,
    Clock,
    ChevronRight,
    Edit3,
    Trash2,
    XCircle,
    Bike,
    PlusCircle
} from 'lucide-react';

type LatLng = { lat: number; lng: number };

type LeafletMarker = {
    addTo: (map: LeafletMap) => LeafletMarker;
    on: (event: string, handler: () => void) => void;
    getLatLng: () => LatLng;
    setLatLng: (latLng: LatLng) => void;
};

type LeafletMap = {
    on: (event: string, handler: (event: { latlng: LatLng }) => void) => void;
    panTo: (latLng: [number, number]) => void;
    remove: () => void;
};

type LeafletLib = {
    map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap;
    tileLayer: (url: string, options: { maxZoom: number }) => { addTo: (map: LeafletMap) => void };
    marker: (latLng: [number, number], options: { draggable: boolean }) => LeafletMarker;
};

const DEFAULT_PICKUP = { lat: 13.7563, lng: 100.5018 };

function getRoleFromAccessToken(token: string | null): 'user' | 'rider' | 'admin' | null {
    if (!token) return null;
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;

        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const json = atob(padded);
        const parsed = JSON.parse(json) as { role?: string };

        if (parsed.role === 'admin' || parsed.role === 'rider' || parsed.role === 'user') {
            return parsed.role;
        }
        return null;
    } catch {
        return null;
    }
}

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
        const existingScript = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
        if (existingScript) {
            if ((window as any).L) {
                resolve();
                return;
            }
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', () => reject(new Error('Failed to load leaflet')));
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
    productName: string;
    contactPhone: string;
    status: 'pending' | 'assigned' | 'picked_up' | 'completed' | 'cancelled';
    pickupAddress: string | null;
    pickupType: 'now' | 'schedule';
    pickupAt: string | null;
    totalPrice: number;
    createdAt: string;
    images?: string[];
    description?: string;
    pickupLocation?: {
        type: 'Point';
        coordinates: number[];
    };
}

interface CustomerProfile {
    firstName: string;
    lastName: string;
    role?: 'user' | 'rider' | 'admin';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
    assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Bike },
    picked_up: { label: 'Picked Up', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: Package },
    completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

export default function CustomerPage() {
    const router = useRouter();
    const editMapContainerRef = useRef<HTMLDivElement | null>(null);
    const editMapInstanceRef = useRef<LeafletMap | null>(null);
    const editMarkerRef = useRef<LeafletMarker | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [editProductName, setEditProductName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editContactPhone, setEditContactPhone] = useState('');
    const [editBasketPhotos, setEditBasketPhotos] = useState<File[]>([]);
    const [editBasketPreviews, setEditBasketPreviews] = useState<string[]>([]);
    const [editPickupLatitude, setEditPickupLatitude] = useState('');
    const [editPickupLongitude, setEditPickupLongitude] = useState('');
    const [editPickupAddress, setEditPickupAddress] = useState('');
    const [editPickupType, setEditPickupType] = useState<'now' | 'schedule'>('now');
    const [editPickupDate, setEditPickupDate] = useState('');
    const [editPickupTime, setEditPickupTime] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isAdminSession, setIsAdminSession] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.replace('/');
            return;
        }

        const tokenRole = getRoleFromAccessToken(token);
        const authRole = localStorage.getItem('auth_role') || tokenRole;
        if (tokenRole && localStorage.getItem('auth_role') !== tokenRole) {
            localStorage.setItem('auth_role', tokenRole);
        }
        setIsAdminSession(authRole === 'admin');

        async function fetchData() {
            try {
                const [ordersData, profileData] = await Promise.all([
                    apiFetch('/customers/orders'),
                    apiFetch('/customers/me'),
                ]);
                setOrders(Array.isArray(ordersData) ? ordersData : ordersData?.orders || []);
                setProfile(profileData);
                if (profileData?.role === 'admin') {
                    setIsAdminSession(true);
                    localStorage.setItem('auth_role', 'admin');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message.toLowerCase() : '';
                if (message.includes('unauthorized')) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user_role');
                    localStorage.removeItem('auth_role');
                    router.replace('/');
                    return;
                }
                setOrders([]);
                setProfile(null);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [router]);

    useEffect(() => {
        const urls = editBasketPhotos.map((file) => URL.createObjectURL(file));
        setEditBasketPreviews(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [editBasketPhotos]);

    useEffect(() => {
        let mounted = true;

        const setupMap = async () => {
            if (!editingOrder) return;

            const L = await loadLeaflet();
            if (!mounted || !L || !editMapContainerRef.current || editMapInstanceRef.current) {
                return;
            }

            const initialLat = Number(editPickupLatitude) || DEFAULT_PICKUP.lat;
            const initialLng = Number(editPickupLongitude) || DEFAULT_PICKUP.lng;

            const map = L.map(editMapContainerRef.current, {
                center: [initialLat, initialLng],
                zoom: 15,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
            }).addTo(map);

            const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

            marker.on('dragend', () => {
                const point = marker.getLatLng();
                setEditPickupLatitude(String(point.lat));
                setEditPickupLongitude(String(point.lng));
            });

            map.on('click', (event: { latlng: LatLng }) => {
                const point = event.latlng;
                marker.setLatLng(point);
                setEditPickupLatitude(String(point.lat));
                setEditPickupLongitude(String(point.lng));
            });

            editMapInstanceRef.current = map;
            editMarkerRef.current = marker;
        };

        setupMap();

        return () => {
            mounted = false;
            if (editMapInstanceRef.current) {
                editMapInstanceRef.current.remove();
            }
            editMapInstanceRef.current = null;
            editMarkerRef.current = null;
        };
    }, [editingOrder]);

    useEffect(() => {
        const lat = Number(editPickupLatitude);
        const lng = Number(editPickupLongitude);

        if (Number.isNaN(lat) || Number.isNaN(lng) || !editMarkerRef.current || !editMapInstanceRef.current) {
            return;
        }

        editMarkerRef.current.setLatLng({ lat, lng });
        editMapInstanceRef.current.panTo([lat, lng]);
    }, [editPickupLatitude, editPickupLongitude]);

    const filesToBase64 = async (files: File[]) => {
        const readers = files.map(
            (file) =>
                new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error('Failed to read image'));
                    reader.readAsDataURL(file);
                }),
        );
        return Promise.all(readers);
    };

    const openEdit = (order: Order) => {
        setEditProductName(order.productName);
        setEditDescription(order.description || '');
        setEditContactPhone(order.contactPhone || '');
        setEditPickupAddress(order.pickupAddress || '');
        setEditPickupType(order.pickupType || 'now');
        setEditBasketPhotos([]);

        const coordinates = order.pickupLocation?.coordinates;
        if (Array.isArray(coordinates) && coordinates.length >= 2) {
            setEditPickupLongitude(String(coordinates[0]));
            setEditPickupLatitude(String(coordinates[1]));
        } else {
            setEditPickupLongitude('');
            setEditPickupLatitude('');
        }

        if (order.pickupAt) {
            const pickupDateTime = new Date(order.pickupAt);
            setEditPickupDate(pickupDateTime.toISOString().slice(0, 10));
            setEditPickupTime(pickupDateTime.toISOString().slice(11, 16));
        } else {
            setEditPickupDate('');
            setEditPickupTime('');
        }

        setEditingOrder(order);
    };

    const saveEdit = async () => {
        if (!editingOrder) return;

        const pickupLatitude = Number(editPickupLatitude);
        const pickupLongitude = Number(editPickupLongitude);
        if (Number.isNaN(pickupLatitude) || Number.isNaN(pickupLongitude)) {
            alert('Pickup latitude/longitude must be numbers');
            return;
        }

        if (editPickupType === 'schedule' && (!editPickupDate.trim() || !editPickupTime.trim())) {
            alert('Please select pickup date and time');
            return;
        }

        const pickupAt =
            editPickupType === 'schedule'
                ? new Date(`${editPickupDate}T${editPickupTime}:00`).toISOString()
                : null;

        setEditSaving(true);
        try {
            const updated = await apiFetch(`/customers/orders/${editingOrder._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    productName: editProductName,
                    description: editDescription,
                    contactPhone: editContactPhone,
                    pickupLatitude,
                    pickupLongitude,
                    pickupAddress: editPickupAddress,
                    pickupType: editPickupType,
                    pickupAt,
                    images: editBasketPhotos.length ? await filesToBase64(editBasketPhotos) : undefined,
                }),
            });
            setOrders(prev => prev.map(o => o._id === editingOrder._id ? { ...o, ...updated } : o));
            setEditingOrder(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update order');
        } finally {
            setEditSaving(false);
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (!confirm('Delete this order? This cannot be undone.')) return;
        setDeletingId(orderId);
        try {
            await apiFetch(`/customers/orders/${orderId}`, { method: 'DELETE' });
            setOrders(prev => prev.filter(o => o._id !== orderId));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete order');
        } finally {
            setDeletingId(null);
        }
    };

    const useEditCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported in this browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setEditPickupLatitude(String(position.coords.latitude));
                setEditPickupLongitude(String(position.coords.longitude));
            },
            () => alert('Cannot access current location. Please allow location permission.'),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    };

    const activeOrders = (orders || []).filter(o => o.status && !['completed', 'cancelled'].includes(o.status));

    // Improved Greeting Logic
    const getGreeting = () => {
        if (loading) return 'Welcome back!';
        if (profile?.firstName) return `Hello, ${profile.firstName}!`;
        return 'Welcome back!';
    };
    const greeting = getGreeting();

    return (
        <>
            {/* Edit Modal */}
            {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
                        <h3 className="text-xl font-black text-blue-900 mb-6">Edit Order</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-bold text-blue-900">Product Name</label>
                                <input
                                    value={editProductName}
                                    onChange={e => setEditProductName(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-bold text-blue-900">Basket Photos</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(event) => setEditBasketPhotos(Array.from(event.target.files ?? []))}
                                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                />
                                <p className="mt-1 text-xs font-semibold text-blue-700/70">
                                    Current photos: {editingOrder.images?.length ?? 0}
                                </p>
                                {editBasketPreviews.length > 0 && (
                                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                        {editBasketPreviews.map((previewUrl, index) => (
                                            <div key={`${previewUrl}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                                <img src={previewUrl} alt={`Edit basket preview ${index + 1}`} className="h-20 w-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-bold text-blue-900">Contact Phone</label>
                                <input
                                    value={editContactPhone}
                                    onChange={e => setEditContactPhone(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <div ref={editMapContainerRef} className="h-56 w-full" />
                            </div>
                            <div className="-mt-2 flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold text-blue-700/70">Drag marker or click on map to change pickup location.</p>
                                <button
                                    type="button"
                                    onClick={useEditCurrentLocation}
                                    className="rounded-xl border border-emerald-200 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50"
                                >
                                    Use Current Location
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-bold text-blue-900">Pickup Latitude</label>
                                    <input
                                        value={editPickupLatitude}
                                        onChange={e => setEditPickupLatitude(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-bold text-blue-900">Pickup Longitude</label>
                                    <input
                                        value={editPickupLongitude}
                                        onChange={e => setEditPickupLongitude(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-blue-900">Description</label>
                                <textarea
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-bold text-blue-900">Pickup Address</label>
                                <input
                                    value={editPickupAddress}
                                    onChange={e => setEditPickupAddress(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-4">
                                <p className="mb-2 text-sm font-bold">Pickup Time</p>
                                <div className="mb-3 flex gap-4">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                        <input
                                            type="radio"
                                            name="editPickupType"
                                            checked={editPickupType === 'now'}
                                            onChange={() => setEditPickupType('now')}
                                        />
                                        Pickup Now
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                        <input
                                            type="radio"
                                            name="editPickupType"
                                            checked={editPickupType === 'schedule'}
                                            onChange={() => setEditPickupType('schedule')}
                                        />
                                        Schedule Pickup
                                    </label>
                                </div>

                                {editPickupType === 'schedule' && (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <input
                                            type="date"
                                            value={editPickupDate}
                                            onChange={event => setEditPickupDate(event.target.value)}
                                            className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                                        />
                                        <input
                                            type="time"
                                            value={editPickupTime}
                                            onChange={event => setEditPickupTime(event.target.value)}
                                            className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-500"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setEditingOrder(null)}
                                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={editSaving || !editProductName.trim()}
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 bg-grid-pattern pt-8 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <header>
                            <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2 selection:bg-blue-100">{greeting}</h1>
                            <p className="text-blue-700/60 font-medium">Ready for some fresh and clean clothes today?</p>
                        </header>
                        <Link href="/customer/create-order" className="bg-blue-600 px-10 py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all inline-flex items-center justify-center animate-pulse-glow group">
                            <PlusCircle className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
                            Create New Order
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Current Orders */}
                        <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/30 border border-white animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-blue-900">Current Orders</h3>
                                {activeOrders.length > 0 && (
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                                        {activeOrders.length} Active
                                    </span>
                                )}
                            </div>
                            {loading ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                                </div>
                            ) : activeOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 px-8 bg-slate-50/50 rounded-3xl border-2 border-dashed border-blue-100/50 transition-all hover:bg-slate-50">
                                    <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles className="h-8 w-8 text-blue-400 animate-pulse" />
                                    </div>
                                    <h4 className="text-lg font-black text-blue-900 mb-1">Stay Fresh & Clean</h4>
                                    <p className="text-blue-700/50 font-medium text-center max-w-[240px]">Everything is clean! No active orders at the moment.</p>
                                    <Link href="/customer/create-order" className="mt-6 text-blue-600 font-bold hover:underline flex items-center gap-1 group">
                                        Start a new order <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {activeOrders.map((order) => {
                                        const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                        const isPending = order.status === 'pending';
                                        return (
                                            <div key={order._id} className={`p-5 rounded-2xl border ${cfg.bg} transition-all hover:shadow-md`}>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black text-blue-900 truncate">{order.productName}</h4>
                                                        <p className="text-xs text-blue-500 mt-1">
                                                            {new Date(order.createdAt).toLocaleDateString('th-TH', {
                                                                day: 'numeric', month: 'short', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit',
                                                            })}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${cfg.color} ${cfg.bg} relative overflow-hidden group`}>
                                                        {isPending && (
                                                            <span className="absolute left-0 top-0 h-full w-1 bg-amber-400 animate-pulse" />
                                                        )}
                                                        <cfg.icon className={`h-3.5 w-3.5 ${isPending ? 'animate-bounce' : ''}`} /> {cfg.label}
                                                    </span>
                                                </div>
                                                {order.pickupAddress && (
                                                    <p className="text-sm text-blue-700/60 mb-2">
                                                        <span className="font-bold">Pickup:</span> {order.pickupAddress}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-xs font-bold text-blue-500">
                                                        {order.pickupType === 'schedule' && order.pickupAt
                                                            ? `Scheduled: ${new Date(order.pickupAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                                            : 'Pickup Now'}
                                                    </span>
                                                    {order.totalPrice > 0 && (
                                                        <span className="text-sm font-black text-blue-900">฿{order.totalPrice.toLocaleString()}</span>
                                                    )}
                                                </div>
                                                {/* Edit / Delete — only for pending orders */}
                                                {isPending && (
                                                    <div className="flex gap-2 mt-4 pt-3 border-t border-amber-200">
                                                        <button
                                                            onClick={() => openEdit(order)}
                                                            className="flex-1 rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => deleteOrder(order._id)}
                                                            disabled={deletingId === order._id}
                                                            className="flex-1 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> {deletingId === order._id ? 'Deleting…' : 'Delete'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Right column */}
                        <div className="space-y-8">
                            {/* Service Promos */}
                            <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/30 border border-white animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                                <h3 className="text-xl font-black text-blue-900 mb-6">Service Promos</h3>
                                <div className="grid gap-4">
                                    <div className="group p-6 rounded-3xl bg-blue-600 text-white relative overflow-hidden shadow-xl shadow-blue-200/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        <div className="absolute -top-4 -right-4 h-24 w-24 bg-white/10 rounded-full blur-2xl transition-all group-hover:scale-150"></div>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                                <Ticket className="h-6 w-6 text-white" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter bg-white/30 px-2 py-1 rounded-lg">New Offer</span>
                                        </div>
                                        <h4 className="text-lg font-black mb-1">Weekend Special</h4>
                                        <p className="text-white/80 text-sm font-bold">20% OFF for all drying services!</p>
                                    </div>
                                    <div className="group p-6 rounded-3xl bg-sky-500 text-white relative overflow-hidden shadow-xl shadow-sky-200/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        <div className="absolute -bottom-4 -left-4 h-24 w-24 bg-white/10 rounded-full blur-2xl transition-all group-hover:scale-150"></div>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                                <Truck className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        <h4 className="text-lg font-black mb-1">Free Delivery</h4>
                                        <p className="text-white/80 text-sm font-bold">For orders over ฿500. Order now!</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Completed */}
                            {orders.filter(o => o.status === 'completed').length > 0 && (
                                <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/30 border border-white animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                                    <h3 className="text-xl font-black text-blue-900 mb-6">Recently Completed</h3>
                                    <div className="space-y-3">
                                        {orders.filter(o => o.status === 'completed').slice(0, 3).map((order) => (
                                            <div key={order._id} className="flex items-center justify-between p-4 rounded-2xl bg-green-50/50 border border-green-100 transition-all hover:bg-green-50 group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-green-100 flex items-center justify-center">
                                                        <Package className="h-5 w-5 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-green-900 text-sm">{order.productName}</h4>
                                                        <p className="text-xs text-green-700/60 font-medium">
                                                            {new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <CheckCircle className="h-5 w-5 text-green-500 transition-transform group-hover:scale-110" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
