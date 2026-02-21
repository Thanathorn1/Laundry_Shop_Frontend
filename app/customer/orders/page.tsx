"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Loader, AlertCircle, Star, CheckCircle, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import RatingModal from "@/components/RatingModal";

interface OrderItem {
  id: string;
  orderNumber: string;
  merchantName: string;
  riderName?: string;
  totalAmount: number;
  status: "pending" | "accepted" | "pickup" | "delivering" | "completed" | "cancelled";
  createdAt: string;
  completedAt?: string;
  hasRating?: boolean;
  rating?: {
    merchantRating: number;
    riderRating: number;
  };
  deliveryAddress: string;
}

export default function CustomerOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex items-center justify-center">
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
      // Update local state to reflect rating
      setOrders(
        orders.map((order) =>
          order.id === data.orderId
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
    if (filter === "completed") return order.status === "completed";
    if (filter === "pending")
      return ["pending", "accepted", "pickup", "delivering"].includes(order.status);
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { bg: string; text: string; label: string }
    > = {
      pending: { bg: "bg-gray-100", text: "text-gray-800", label: "Pending" },
      accepted: { bg: "bg-blue-100", text: "text-blue-800", label: "Accepted" },
      pickup: { bg: "bg-purple-100", text: "text-purple-800", label: "Picking Up" },
      delivering: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "Delivering",
      },
      completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 pb-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/customer"
            className="inline-block mb-4 text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">View and manage your order history</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {[
            { id: "all", label: "All Orders" },
            { id: "pending", label: "In Progress" },
            { id: "completed", label: "Completed" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id as any)}
              className={`rounded-full px-4 py-2 font-semibold transition-all ${filter === id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:shadow-md"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <MapPin size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {filter === "all" ? "" : filter} orders yet
            </h3>
            <p className="text-gray-600 mb-6">
              When you place an order, it will appear here
            </p>
            <Link
              href="/customer/create-order"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Place an Order
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          <Clock size={14} className="inline mr-1" />
                          {new Date(order.createdAt).toLocaleDateString()} at{" "}
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Merchant & Rider Info */}
                    <div className="mt-4 space-y-2 text-sm">
                      <p>
                        <span className="font-semibold text-gray-700">Merchant:</span>{" "}
                        <span className="text-gray-900">{order.merchantName}</span>
                      </p>
                      {order.riderName && order.status !== "pending" && (
                        <p>
                          <span className="font-semibold text-gray-700">Rider:</span>{" "}
                          <span className="text-gray-900">{order.riderName}</span>
                        </p>
                      )}
                      <p className="text-gray-600">
                        <MapPin size={14} className="inline mr-1" />
                        {order.deliveryAddress}
                      </p>
                    </div>

                    {/* Rating Info */}
                    {order.hasRating && order.rating && (
                      <div className="mt-4 flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Merchant:</span>
                          <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < order.rating!.merchantRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Rider:</span>
                          <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < order.rating!.riderRating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Amount & Action */}
                  <div className="flex flex-col items-end gap-3 sm:text-right">
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ฿{(order.totalAmount ?? 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      {order.status === "completed" && !order.hasRating && (
                        <button
                          onClick={() => setSelectedOrderForRating(order.id)}
                          className="flex-1 sm:flex-none rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-white hover:bg-yellow-600 transition-colors text-sm"
                        >
                          <Star size={16} className="inline mr-1" />
                          Rate
                        </button>
                      )}
                      {order.status === "completed" && order.hasRating && (
                        <button
                          disabled
                          className="flex-1 sm:flex-none rounded-lg bg-green-100 px-4 py-2 font-semibold text-green-800 text-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} />
                          Rated
                        </button>
                      )}
                      <Link
                        href={`/customer/orders/${order.id}`}
                        className="flex-1 sm:flex-none rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Modal */}
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
