"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ChevronLeft,
    Clock,
    MapPin,
    Package,
    Phone,
    User,
    CreditCard,
    CheckCircle,
    AlertCircle,
    Truck,
    Layers,
    Calendar,
    ArrowRight,
    Loader,
    ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, resolveImageUrl } from "@/lib/api";
import Link from "next/link";

interface Order {
    _id: string;
    productName: string;
    description?: string;
    contactPhone?: string;
    pickupAddress?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    pickupType: 'now' | 'schedule';
    pickupDate?: string;
    pickupTime?: string;
    status: 'pending' | 'assigned' | 'picked_up' | 'completed' | 'cancelled';
    images: string[];
    totalPrice: number;
    createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any; border: string }> = {
    pending: { label: 'Order Registered', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock, border: 'border-blue-100' },
    assigned: { label: 'Rider Dispatched', color: 'text-amber-600', bg: 'bg-amber-50', icon: Truck, border: 'border-amber-100' },
    picked_up: { label: 'In Service', color: 'text-purple-600', bg: 'bg-purple-50', icon: Layers, border: 'border-purple-100' },
    completed: { label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, border: 'border-emerald-100' },
    cancelled: { label: 'Terminated', color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle, border: 'border-rose-100' },
};

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setLoading(true);
                const data = await apiFetch(`/customers/orders/${params.id}`);
                setOrder(data);
            } catch (err: any) {
                setError(err.message || "Failed to load order parameters");
            } finally {
                setLoading(false);
            }
        };

        if (params.id) fetchOrder();
    }, [params.id]);

    useEffect(() => {
        if (!order || !mapContainerRef.current) return;

        const initMap = async () => {
            const { loadLeaflet } = await import('@/lib/leaflet-loader');
            const L = await loadLeaflet();
            if (!L) return;

            const container = mapContainerRef.current;
            if (!container) return;

            // Clear existing map if any
            if ((container as any)._leaflet_id) return;

            const lat = order.pickupLatitude || 13.7563;
            const lng = order.pickupLongitude || 100.5018;

            const map = L.map(container, {
                center: [lat, lng],
                zoom: 15,
                scrollWheelZoom: false
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            // Using the fixed default marker
            L.marker([lat, lng]).addTo(map);
        };

        initMap();
    }, [order]);

    if (loading) {
        return (
            <div className="min-h-screen bg-grid-pattern  flex flex-col items-center justify-center p-6 transition-colors duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                    <Loader size={48} className="animate-spin text-blue-600 relative z-10" />
                </div>
                <p className="mt-8 text-sm font-black text-blue-900/40 /40 uppercase tracking-[0.3em] animate-pulse">Initializing Order Buffer...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-grid-pattern  flex flex-col items-center justify-center p-6 text-center transition-colors duration-500">
                <div className="h-20 w-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-soft border border-rose-100">
                    <AlertCircle size={40} className="text-rose-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-900  uppercase tracking-tight mb-2 italic">Data Stream Terminated</h1>
                <p className="text-slate-500 font-bold mb-8 max-w-md">{error || "The requested order parameters were not found."}</p>
                <Link href="/customer" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:shadow-premium transition-all">
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;

    return (
        <main className="min-h-screen bg-grid-pattern  pt-12 pb-24 px-6 lg:px-8 transition-colors duration-500">
            <div className="max-w-5xl mx-auto">
                {/* Immersive Background Layer */}
                <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10  blur-[120px]" />
                    <div className="absolute bottom-[20%] right-[-5%] w-[35%] h-[35%] rounded-full bg-indigo-400/10  blur-[100px]" />
                </div>

                {/* Back Button */}
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => router.back()}
                    className="group mb-12 flex items-center gap-2 px-6 py-3 rounded-2xl glass-card text-blue-900  font-black text-xs uppercase tracking-widest hover:bg-white hover:shadow-premium transition-all border border-white/20 "
                >
                    <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Matrix
                </motion.button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Primary Order Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card rounded-[3rem] p-8 md:p-12 border border-white/20  shadow-premium overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-xl ${statusConfig.bg}`}>
                                            <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${statusConfig.color}`}>{statusConfig.label}</span>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900  uppercase tracking-tight leading-tight italic">
                                        {order.productName}
                                    </h1>
                                    <div className="flex items-center gap-4 mt-4">
                                        <span className="text-[10px] font-black text-blue-600  bg-blue-50  px-3 py-1 rounded-full border border-blue-100 ">#{order._id.slice(-8).toUpperCase()}</span>
                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered: {new Date(order.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Valuation</p>
                                    <p className="text-4xl font-black text-blue-600  leading-none">฿{order.totalPrice.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-10 border-t border-slate-100 ">
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 min-w-[40px] rounded-xl bg-slate-50  flex items-center justify-center border border-slate-100 ">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup Coordinates</p>
                                            <p className="text-sm font-bold text-slate-700 leading-relaxed">{order.pickupAddress || "Location Node Unspecified"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 min-w-[40px] rounded-xl bg-slate-50  flex items-center justify-center border border-slate-100 ">
                                            <Phone className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact Protocol</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{order.contactPhone || "Communication Stream Offline"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 min-w-[40px] rounded-xl bg-slate-50  flex items-center justify-center border border-slate-100 ">
                                            <Calendar className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule Parameters</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                {order.pickupType === 'now' ? 'Immediate Execution' : `${order.pickupDate || '---'} at ${order.pickupTime || '---'}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-10 w-10 min-w-[40px] rounded-xl bg-slate-50  flex items-center justify-center border border-slate-100 ">
                                            <ShieldCheck className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Service Assurance</p>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 italic">Premium Operational Coverage Active</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {order.description && (
                                <div className="mt-8 p-6 rounded-2xl bg-blue-50/50  border border-blue-100/30 /20">
                                    <p className="text-[10px] font-black text-blue-600  uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" /> Special Instructions
                                    </p>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{order.description}"</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Order Timeline / Status Mapping */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-[3rem] p-10 border border-white/20  shadow-premium"
                        >
                            <h3 className="text-xl font-black text-slate-900  uppercase tracking-tight mb-8 italic">Operational Timeline</h3>
                            <div className="relative">
                                {/* Connecting Line */}
                                <div className="absolute left-6 top-0 bottom-0 w-1 bg-slate-100  ml-[-0.5px]" />

                                <div className="space-y-12">
                                    {[
                                        { key: 'pending', label: 'Order Registered', detail: 'Primary parameters acknowledged by system' },
                                        { key: 'assigned', label: 'Rider Dispatched', detail: 'Logistics unit assigned for pickup' },
                                        { key: 'picked_up', label: 'In Service', detail: 'Asset entered high-end cleaning cycle' },
                                        { key: 'completed', label: 'Delivered', detail: 'Mission successful. Asset returned' }
                                    ].map((step, i) => {
                                        const steps = ['pending', 'assigned', 'picked_up', 'completed'];
                                        const currentIdx = steps.indexOf(order.status);
                                        const stepIdx = i;
                                        const isCompleted = stepIdx < currentIdx;
                                        const isActive = stepIdx === currentIdx;
                                        const isFuture = stepIdx > currentIdx;

                                        return (
                                            <div key={step.key} className="relative flex items-center gap-8 group">
                                                <div className={`relative z-10 h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' :
                                                    isActive ? 'bg-white  border-blue-600 text-blue-600 shadow-glow' :
                                                        'bg-slate-50  border-slate-100  text-slate-300'
                                                    }`}>
                                                    {isCompleted ? <CheckCircle size={20} /> : <span className="text-sm font-black">{i + 1}</span>}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-blue-600 ' : isCompleted ? 'text-slate-900 ' : 'text-slate-400'}`}>
                                                        {step.label}
                                                    </h4>
                                                    <p className="text-[11px] font-bold text-slate-500 mt-1">{step.detail}</p>
                                                </div>
                                                {isActive && (
                                                    <div className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-[8px] font-black uppercase tracking-widest animate-pulse border border-blue-600/20">LIVE STATUS</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Visual Mapping & Asset Previews */}
                    <div className="space-y-8">
                        {/* Spatial Mapping Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="glass-card rounded-[2.5rem] overflow-hidden border border-white/20  shadow-premium"
                        >
                            <div ref={mapContainerRef} className="h-64 w-full grayscale-[0.5] contrast-[1.1]" />
                            <div className="p-6 bg-slate-900  flex items-center justify-between text-white">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Spatial Mapping</p>
                                    <p className="text-[10px] font-black tracking-widest">{order.pickupLatitude?.toFixed(6) || '---'}, {order.pickupLongitude?.toFixed(6) || '---'}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-600/30">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Asset Previews (Order Images) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="glass-card rounded-[2.5rem] p-8 border border-white/20  shadow-premium"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-slate-900  uppercase tracking-tight italic">Asset Inventory</h3>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.images.length} Units</span>
                            </div>

                            {order.images.length > 0 ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {order.images.map((img, i) => (
                                        <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                                            <img
                                                src={resolveImageUrl(img) || ''}
                                                alt={`Asset ${i + 1}`}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                <Layers className="text-white h-6 w-6" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center rounded-[2rem] bg-slate-50 /50 border-2 border-dashed border-slate-100 ">
                                    <Package className="h-10 w-10 text-slate-200 mb-3" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Visual Assets Found</p>
                                </div>
                            )}
                        </motion.div>

                        {/* Support Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="glass-premium rounded-[2.5rem] p-8 bg-slate-900 text-white shadow-premium relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 h-24 w-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                            <div className="relative z-10">
                                <h4 className="text-lg font-black uppercase tracking-tight mb-2 italic">Support Protocol</h4>
                                <p className="text-xs font-bold text-white/70 mb-6 leading-relaxed">Immediate assistance for this specific operation stream.</p>
                                <button className="w-full py-4 rounded-xl bg-white text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] shadow-lg active:scale-95 transition-all">
                                    Initiate Comms
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </main>
    );
}
