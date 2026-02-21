"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Order {
    _id: string;
    productName: string;
    contactPhone: string;
    status: "pending" | "assigned" | "picked_up" | "completed" | "cancelled";
    pickupAddress: string | null;
    pickupType: "now" | "schedule";
    pickupAt: string | null;
    totalPrice: number;
    createdAt: string;
    images?: string[];
    description?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: "✅" },
    cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "❌" },
    pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "⏳" },
    assigned: { label: "Assigned", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "🚴" },
    picked_up: { label: "Picked Up", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: "📦" },
};

export default function CustomerHistoryPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.replace("/");
            return;
        }

        async function fetchOrders() {
            try {
                const data = await apiFetch("/customers/orders");
                const allOrders: Order[] = Array.isArray(data) ? data : data?.orders || [];
                // Show only completed and cancelled orders (history)
                setOrders(allOrders.filter((o) => o.status === "completed" || o.status === "cancelled"));
            } catch (error) {
                const message = error instanceof Error ? error.message.toLowerCase() : "";
                if (message.includes("unauthorized")) {
                    localStorage.removeItem("access_token");
                    localStorage.removeItem("refresh_token");
                    localStorage.removeItem("auth_role");
                    router.replace("/");
                    return;
                }
                setOrders([]);
            } finally {
                setLoading(false);
            }
        }

        fetchOrders();
    }, [router]);

    const filteredOrders = orders.filter((order) => {
        if (filter === "completed") return order.status === "completed";
        if (filter === "cancelled") return order.status === "cancelled";
        return true;
    });

    const completedCount = orders.filter((o) => o.status === "completed").length;
    const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-blue-900">
            {/* Sidebar */}
            <aside className="w-72 border-r border-blue-50 bg-white p-8 shadow-sm h-screen sticky top-0">
                <div className="flex items-center gap-3 mb-10">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-white font-black text-xl">C</span>
                    </div>
                    <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">Laundry Client</h2>
                </div>
                <nav className="space-y-1.5">
                    <Link href="/customer" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🏠</span>
                        Dashboard
                    </Link>
                    <Link href="/customer/create-order" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">➕</span>
                        New Order
                    </Link>
                    <Link href="/customer/orders" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">⭐</span>
                        My Orders & Ratings
                    </Link>
                    <Link href="/customer/settings" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                        <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">⚙️</span>
                        Profile Settings
                    </Link>
                    <Link href="/customer/history" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold bg-blue-50 text-blue-700 shadow-sm transition-all border border-blue-100">
                        <span className="mr-3 text-lg">📅</span>
                        History
                    </Link>
                    <div className="pt-6 mt-6 border-t border-slate-100">
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.href = "/";
                            }}
                            className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all group"
                        >
                            <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🚪</span>
                            Logout
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-12">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2">Order History</h1>
                    <p className="text-blue-700/60 font-medium">View all your past completed and cancelled orders</p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-blue-100/50 border border-white">
                        <p className="text-sm font-bold text-blue-500 mb-1">Total History</p>
                        <p className="text-3xl font-black text-blue-900">{orders.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-green-100/50 border border-white">
                        <p className="text-sm font-bold text-green-500 mb-1">Completed</p>
                        <p className="text-3xl font-black text-green-700">{completedCount}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-lg shadow-red-100/50 border border-white">
                        <p className="text-sm font-bold text-red-400 mb-1">Cancelled</p>
                        <p className="text-3xl font-black text-red-600">{cancelledCount}</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: "all" as const, label: "All" },
                        { id: "completed" as const, label: "Completed" },
                        { id: "cancelled" as const, label: "Cancelled" },
                    ].map(({ id, label }) => (
                        <button
                            key={id}
                            onClick={() => setFilter(id)}
                            className={`rounded-full px-5 py-2 text-sm font-black transition-all ${filter === id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                                    : "bg-white text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 border border-slate-200"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Orders List */}
                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-white">
                        <span className="text-5xl mb-4">📭</span>
                        <h3 className="text-lg font-black text-blue-900 mb-2">No history yet</h3>
                        <p className="text-blue-700/60 font-medium mb-6">Your completed and cancelled orders will appear here</p>
                        <Link
                            href="/customer/create-order"
                            className="bg-blue-600 px-6 py-3 rounded-xl text-white font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                        >
                            Create New Order
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map((order) => {
                                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.completed;
                                return (
                                    <div
                                        key={order._id}
                                        className={`p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-blue-900 text-lg truncate">{order.productName}</h4>
                                                <p className="text-xs text-blue-500 mt-1">
                                                    {new Date(order.createdAt).toLocaleDateString("th-TH", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${cfg.color} ${cfg.bg}`}
                                            >
                                                <span>{cfg.icon}</span> {cfg.label}
                                            </span>
                                        </div>

                                        {order.pickupAddress && (
                                            <p className="text-sm text-blue-700/60 mb-2">
                                                <span className="font-bold">Pickup:</span> {order.pickupAddress}
                                            </p>
                                        )}

                                        {order.description && (
                                            <p className="text-sm text-blue-700/50 mb-2">
                                                <span className="font-bold">Note:</span> {order.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                            <span className="text-xs font-bold text-blue-500">
                                                {order.pickupType === "schedule" && order.pickupAt
                                                    ? `Scheduled: ${new Date(order.pickupAt).toLocaleString("th-TH", {
                                                        day: "numeric",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}`
                                                    : "Pickup Now"}
                                            </span>
                                            {(order.totalPrice ?? 0) > 0 && (
                                                <span className="text-sm font-black text-blue-900">
                                                    ฿{(order.totalPrice ?? 0).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </main>
        </div>
    );
}
