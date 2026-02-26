"use client";

import Link from 'next/link';
import Image from 'next/image';
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
    PlusCircle,
    TrendingUp,
    Zap,
    Share2,
    MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { loadLeaflet, LeafletLib, LeafletMap, LeafletMarker, LatLng } from "@/lib/leaflet-loader";

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

// Local loader removed

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

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; icon: any }> = {
    pending: { label: 'Waiting', color: 'text-amber-500', border: 'border-amber-500', bg: 'bg-amber-50 ', icon: Clock },
    assigned: { label: 'Assigned', color: 'text-blue-500', border: 'border-blue-500', bg: 'bg-blue-50 ', icon: Bike },
    picked_up: { label: 'Washing', color: 'text-purple-500', border: 'border-purple-500', bg: 'bg-purple-50 ', icon: Package },
    completed: { label: 'Finished', color: 'text-emerald-500', border: 'border-emerald-500', bg: 'bg-emerald-50 ', icon: CheckCircle },
    cancelled: { label: 'Failed', color: 'text-rose-500', border: 'border-rose-500', bg: 'bg-rose-50 ', icon: XCircle },
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
        if (loading) return 'Welcome back! 👋';
        if (profile?.firstName) return `Hello, ${profile.firstName}! 👋`;
        return 'Welcome back! 👋';
    };
    const greeting = getGreeting();

    return (
        <>
            {editingOrder && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl border border-white/20 transition-colors duration-500">
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
            <main className="flex-1 bg-grid-pattern pt-12 pb-24 transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    {/* Premium Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden glass-premium rounded-[3rem] p-10 md:p-16 mb-12 border border-white/20 shadow-glow"
                    >
                        {/* Background Floating Shapes */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-400/10 rounded-full blur-[100px] animate-pulse-glow" />
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] animate-float-slow" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-12">
                            <div className="max-w-2xl">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600  text-[10px] font-black uppercase tracking-widest mb-6"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    Premium Service Active
                                </motion.div>
                                <h1 className="text-5xl md:text-7xl font-black text-slate-900  tracking-tight mb-6 leading-[1.1]">
                                    {greeting.split('!')[0]}<span className="text-blue-600 ">!</span>
                                </h1>
                                <p className="text-lg md:text-xl text-slate-600  font-medium mb-10 max-w-lg leading-relaxed">
                                    Your laundry, handled with the precision of a modern startup. Experience high-end care with every pickup.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link href="/customer/create-order" className="group bg-blue-600  px-10 py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-premium hover:shadow-glow hover:-translate-y-1 active:scale-95 transition-all inline-flex items-center justify-center whitespace-nowrap overflow-hidden relative">
                                        <div className="absolute inset-0 shimmer opacity-20" />
                                        <PlusCircle className="mr-3 h-6 w-6 transition-transform group-hover:rotate-90" />
                                        New Pickup Request
                                    </Link>
                                    <button className="bg-white/10  backdrop-blur-md px-10 py-5 rounded-2xl text-slate-900  font-black uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-all">
                                        Support
                                    </button>
                                </div>
                            </div>

                            {/* Hero Illustration Wrapper */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 }}
                                className="relative hidden lg:block"
                            >
                                <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-[60px] animate-pulse" />
                                <img
                                    src="/laundry_illustration.png"
                                    alt="Laundry Illustration"
                                    className="relative z-10 w-80 h-80 object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)] animate-float"
                                />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Quick Stats Bar */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        {[
                            { label: 'Active Tasks', value: activeOrders.length, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/5' },
                            { label: 'Service Level', value: 'Prime', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                            { label: 'Points', value: '1.2k', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                            { label: 'Free Deliveries', value: '3', icon: Truck, color: 'text-purple-500', bg: 'bg-purple-500/5' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i }}
                                className="glass-card rounded-[2rem] p-6 border border-white/20 flex items-center gap-4 hover-scale"
                            >
                                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                                    <p className="text-xl font-black text-slate-900 ">{stat.value}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Left Column: Management */}
                        <div className="lg:col-span-2 space-y-10">
                            {/* Current Orders Card */}
                            <div className="glass-card rounded-[2.5rem] p-10 shadow-premium border border-white/20 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-right from-blue-500 via-indigo-500 to-purple-500 opacity-50" />
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900  mb-1">Live Updates</h3>
                                        <p className="text-sm font-medium text-slate-500 italic">Managing your active laundry cycles</p>
                                    </div>
                                    {activeOrders.length > 0 && (
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(activeOrders.length, 3))].map((_, i) => (
                                                <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600 ring-2 ring-blue-500/20">
                                                    {i + 1}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {loading ? (
                                    <div className="flex items-center justify-center p-12">
                                        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                                    </div>
                                ) : activeOrders.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-8 bg-slate-50/50  rounded-premium border border-slate-200  transition-all hover:bg-slate-50 ">
                                        <div className="h-20 w-20 bg-white rounded-[2rem] shadow-sm border border-blue-50 flex items-center justify-center mb-6">
                                            <Sparkles className="h-10 w-10 text-blue-400 animate-pulse" />
                                        </div>
                                        <h4 className="text-xl font-black text-blue-900 mb-2">Stay Fresh & Clean</h4>
                                        <p className="text-blue-700/50 font-medium text-center max-w-[280px]">Everything is clean! No active orders at the moment.</p>
                                        <Link href="/customer/create-order" className="mt-8 px-6 py-3 bg-white rounded-xl border border-blue-100 text-blue-600 font-black text-sm uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-1 group">
                                            Start a new order <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {activeOrders.map((order, idx) => {
                                            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                            const borderColor = status.color.split('-')[1] === 'blue' ? '#3b82f6' : status.color.split('-')[1] === 'amber' ? '#f59e0b' : status.color.split('-')[1] === 'purple' ? '#a855f7' : status.color.split('-')[1] === 'emerald' ? '#10b981' : '#f43f5e';
                                            return (
                                                <motion.div
                                                    key={order._id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 * idx }}
                                                    className="group relative bg-white rounded-3xl p-6 border-l-8 border-r border-t border-b border-white/20 shadow-soft hover:shadow-premium transition-all overflow-hidden"
                                                    style={{ borderLeftColor: borderColor }}
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`h-14 w-14 rounded-2xl ${status.bg} flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform`}>
                                                                <status.icon className={`h-7 w-7 ${status.color}`} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</span>
                                                                    <span className="text-[10px] font-black text-blue-600  bg-blue-50  px-2 py-0.5 rounded-full">#{order._id.slice(-6).toUpperCase()}</span>
                                                                </div>
                                                                <h4 className="text-lg font-black text-slate-900  group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                                                    {order.productName || 'Laundry Service'}
                                                                </h4>
                                                                <div className="flex items-center gap-3 mt-1.5">
                                                                    <div className="flex items-center gap-1.5 text-slate-500  text-xs font-bold">
                                                                        <MapPin className="h-3.5 w-3.5" />
                                                                        {order.pickupAddress || 'Pick up address'}
                                                                    </div>
                                                                    <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                                    <div className="text-xs font-black text-slate-900 ">
                                                                        ฿{order.totalPrice.toLocaleString()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-3">
                                                            <div className={`px-4 py-1.5 rounded-full ${status.bg} border-2 ${status.border.replace('text-', 'border-').replace('500', '500/20')} flex items-center gap-2`}>
                                                                <div className={`h-2 w-2 rounded-full ${status.color.replace('text-', 'bg-')} animate-pulse`} />
                                                                <span className={`text-[11px] font-black uppercase tracking-widest ${status.color}`}>{status.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => router.push(`/customer/orders/${order._id}`)}
                                                                    className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                                                                    title="View Details"
                                                                >
                                                                    <ChevronRight className="h-5 w-5" />
                                                                </button>
                                                                {order.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => deleteOrder(order._id)}
                                                                        className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                                                                        title="Cancel Order"
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Modern Progress Bar */}
                                                    <div className="mt-6 pt-6 border-t border-slate-50 ">
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                            <span>Stage: {status.label}</span>
                                                            <span>{['pending', 'assigned', 'picked_up', 'completed'].indexOf(order.status) * 25 + 25}%</span>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${['pending', 'assigned', 'picked_up', 'completed'].indexOf(order.status) * 25 + 25}%` }}
                                                                className={`h-full rounded-full ${status.color.replace('text-', 'bg-')} shadow-sm`}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="glass-card rounded-[2.5rem] p-8 shadow-premium border border-white/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-900  uppercase tracking-tight">Member Rewards</h3>
                                    <div className="p-2 rounded-xl bg-blue-50 ">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
                                        <div className="absolute top-0 right-0 opacity-10"> <Zap className="h-24 w-24 -mr-6 -mt-6" /> </div>
                                        <div className="relative z-10">
                                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full inline-block text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10"> Limited Offer </div>
                                            <h4 className="text-2xl font-black mb-1">Weekend Special</h4>
                                            <p className="text-blue-100 text-sm font-medium mb-4">20% OFF for all drying services! Use code "FRESH20"</p>
                                            <button className="w-full py-3 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-sm hover:shadow-glow transition-all active:scale-95"> Claim Now </button>
                                        </div>
                                    </div>
                                    <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
                                        <div className="absolute bottom-0 left-0 opacity-10"> <Truck className="h-20 w-20 -ml-4 -mb-4" /> </div>
                                        <div className="relative z-10">
                                            <h4 className="text-xl font-black mb-1">Free Delivery</h4>
                                            <p className="text-white/80 text-sm font-bold mb-4">For orders over ฿500. Limited time offer!</p>
                                            <button className="w-full py-2.5 bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-white/30"> Details </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Referral Card */}
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="glass-card rounded-[2.5rem] p-8 bg-blue-50 border-2 border-dashed border-blue-200 text-center"
                            >
                                <div className="h-16 w-16 bg-white rounded-2xl shadow-soft mx-auto mb-6 flex items-center justify-center">
                                    <Share2 className="h-8 w-8 text-blue-600" />
                                </div>
                                <h4 className="text-xl font-black text-slate-900  mb-2 uppercase italic">Invite Friends</h4>
                                <p className="text-sm font-medium text-slate-500 mb-6">Give ฿100, Get ฿100 for every friend who joins.</p>
                                <button className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-premium transition-all"> Share Link </button>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
