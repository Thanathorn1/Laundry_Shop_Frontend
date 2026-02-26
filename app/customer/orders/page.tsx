"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
  Loader,
  AlertCircle,
  Star,
  CheckCircle,
  Clock,
  MapPin,
  Search,
  Filter,
  ChevronRight,
  Trash2,
  PackageOpen,
  ArrowRight,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Calendar,
  Layers
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import RatingModal from "@/components/RatingModal";
import { motion, AnimatePresence } from "framer-motion";

interface OrderItem {
  _id: string;
  orderNumber?: string;
  merchantName?: string;
  riderName?: string;
  totalPrice: number;
  status: "pending" | "assigned" | "picked_up" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  hasRating?: boolean;
  rating?: {
    merchantRating: number;
    riderRating: number;
  } | null;
  deliveryAddress: string | null;
}

export default function CustomerOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-grid-pattern p-4 sm:p-6 flex items-center justify-center">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      }
    >
      <CustomerOrdersContent />
    </Suspense>
  );
}

function CustomerOrdersContent() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch("/customers/orders");
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async (data: any) => {
    try {
      await apiFetch(`/customers/orders/${data.orderId}/rating`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      setOrders(
        orders.map((order) =>
          order._id === data.orderId
            ? {
              ...order,
              hasRating: true,
              rating: {
                merchantRating: data.merchantRating,
                riderRating: data.riderRating,
              },
            }
            : order
        )
      );
    } catch (err) {
      throw err;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && order.status === "completed") ||
      (filter === "pending" && ["pending", "assigned", "picked_up"].includes(order.status));

    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.merchantName?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && (searchQuery ? matchesSearch : true);
  });

  const getStatusConfig = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string; border: string }> = {
      pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Waiting", dot: "bg-amber-500", border: "border-amber-200" },
      assigned: { bg: "bg-blue-50", text: "text-blue-700", label: "Accepted", dot: "bg-blue-500", border: "border-blue-200" },
      picked_up: { bg: "bg-purple-50", text: "text-purple-700", label: "Picked Up", dot: "bg-purple-500", border: "border-purple-200" },
      completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Finished", dot: "bg-emerald-500", border: "border-emerald-200" },
      cancelled: { bg: "bg-rose-50", text: "text-rose-700", label: "Voided", dot: "bg-rose-500", border: "border-rose-200" },
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === 'completed').length,
    active: orders.filter(o => ['pending', 'assigned', 'picked_up'].includes(o.status)).length
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-500">
      <div className="mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 px-2 transition-all duration-700 animate-fade-in-up">
          <div className="space-y-4">
            <Link
              href="/customer"
              className="group inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-500 transition-all mb-4 px-4 py-2 bg-blue-50 rounded-full"
            >
              <ChevronRight className="mr-2 h-3 w-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
              Operational Core
            </Link>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">
              Audit <span className="text-blue-600 italic">History</span>
            </h1>
            <p className="text-slate-500 font-bold max-w-lg text-sm leading-relaxed">
              Track your laundry lifecycle with millisecond precision. Every pickup, every delivery, documented.
            </p>
          </div>

          {/* Metrics Quick Bar */}
          <div className="flex gap-2 flex-wrap md:flex-nowrap">
            {[
              { label: 'Total Logs', value: stats.total, icon: Layers, color: 'text-slate-400' },
              { label: 'Active', value: stats.active, icon: TrendingUp, color: 'text-blue-500' },
              { label: 'Finished', value: stats.completed, icon: CheckCircle, color: 'text-emerald-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[1.5rem] p-4 min-w-[120px] shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={12} className={stat.color} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className="text-2xl font-black text-slate-900 leading-none">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar: Search & Filter */}
        <div className="mb-10 flex flex-col md:flex-row gap-4 px-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by Order ID or Merchant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2 p-2 bg-slate-200/50 rounded-[2rem] border border-slate-200/50">
            {[
              { id: "all", label: "All Logs" },
              { id: "pending", label: "Live" },
              { id: "completed", label: "Final" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id as any)}
                className={`rounded-[1.5rem] px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${filter === id
                  ? "bg-white text-blue-600 shadow-sm scale-[1.02] border border-slate-100"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Handling */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 px-2"
            >
              <div className="flex gap-4 rounded-[2rem] bg-rose-50 border border-rose-100 p-6">
                <div className="h-10 w-10 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={20} className="text-rose-600" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest mb-1">System Exception</h4>
                  <p className="text-xs font-bold text-rose-700">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orders List / Content */}
        <div className="space-y-4 px-2">
          {isLoading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <div className="h-20 w-20 border-[6px] border-blue-600/10 rounded-full" />
                <div className="h-20 w-20 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers className="text-blue-600 animate-pulse" size={24} />
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Synchronizing Data</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase animate-pulse">Consulting Blockchain Ledger...</div>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 rounded-[3rem] p-20 text-center shadow-xl"
            >
              <div className="h-32 w-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 group hover:rotate-6 transition-transform">
                <PackageOpen size={64} className="text-slate-200 group-hover:text-blue-500/20 transition-colors" />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                No Logs Found
              </h3>
              <p className="text-slate-500 font-bold mb-12 max-w-sm mx-auto leading-relaxed">
                The terminal is currently silent. Start an operational request to populate this feed.
              </p>
              <Link
                href="/customer/create-order"
                className="group inline-flex items-center gap-4 bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 rounded-[2.5rem] text-sm font-black uppercase tracking-widest shadow-glow hover:shadow-premium transition-all active:scale-95"
              >
                New Request Flow
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </Link>
            </motion.div>
          ) : (
            <div className="grid gap-6">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map((order, idx) => {
                  const status = getStatusConfig(order.status);
                  return (
                    <motion.div
                      key={order._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm hover:shadow-2xl hover:border-blue-500/30 transition-all duration-500 hover:-translate-y-1"
                    >
                      <div className="flex flex-col lg:flex-row gap-8">
                        {/* Order Identity & Status */}
                        <div className="flex-1 space-y-6">
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID:</span>
                              <span className="ml-2 text-xs font-black text-slate-900 tracking-widest">
                                {order.orderNumber || order._id?.slice(-8).toUpperCase()}
                              </span>
                            </div>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${status.border} ${status.bg}`}>
                              <div className={`h-2 w-2 rounded-full ${status.dot} animate-pulse`} />
                              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${status.text}`}>{status.label}</span>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h2 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">
                              {order.merchantName || 'Laundry Collection'}
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                  <MapPin size={14} className="text-blue-600" />
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Destination</span>
                                  <span className="text-xs font-bold text-slate-600 line-clamp-1">{order.deliveryAddress || 'On-record Address'}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                  <Calendar size={14} className="text-indigo-600" />
                                </div>
                                <div className="space-y-1">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Log Timestamp</span>
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pending'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Audit Details & Actions */}
                        <div className="lg:w-48 flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 gap-6">
                          <div className="text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block mb-2">Settlement</span>
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">
                              <span className="text-blue-600 text-lg align-top mr-1 font-bold">฿</span>
                              {(order.totalPrice ?? 0).toLocaleString()}
                            </div>
                          </div>

                          <div className="w-full space-y-3">
                            {order.status === "completed" && !order.hasRating && (
                              <button
                                onClick={() => setSelectedOrderForRating(order._id)}
                                className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all active:scale-95"
                              >
                                <Star size={14} fill="currentColor" />
                                Review
                              </button>
                            )}
                            <Link
                              href={`/customer/orders/${order._id}`}
                              className="group w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg"
                            >
                              Details
                              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Rating Overlay Short Summary */}
                      {order.hasRating && order.rating && (
                        <div className="absolute top-8 right-8 flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={i < order.rating!.merchantRating ? "fill-blue-500 text-blue-500" : "text-slate-200 dark:text-slate-700"}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Modern Rating Modal Fragment */}
      {selectedOrderForRating && (
        <RatingModal
          isOpen={true}
          onClose={() => setSelectedOrderForRating(null)}
          orderId={selectedOrderForRating}
          onSubmit={handleRatingSubmit}
        />
      )}
    </div>
  );
}
