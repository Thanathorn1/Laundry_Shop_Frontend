"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import RatingModal, { RatingData } from "@/components/RatingModal";

interface Order {
  id: string;
  orderNumber: string;
  merchantName: string;
  riderName?: string;
  totalAmount: number;
  status: string;
  completedAt?: string;
}

export default function OrderRatingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex items-center justify-center">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      }
    >
      <OrderRatingContent />
    </Suspense>
  );
}

function OrderRatingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError("Order ID is required");
      setIsLoading(false);
      return;
    }

    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch(`/customers/orders/${orderId}`);
      setOrder(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        setError("Order not found");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load order");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async (data: RatingData) => {
    try {
      await apiFetch(`/customers/orders/${orderId}/rating`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch (err) {
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex items-center justify-center">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/customer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
          >
            <ArrowLeft size={20} />
            Back to Orders
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="flex gap-4">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Link
                  href="/customer"
                  className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Go Back to Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 pb-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/customer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
        >
          <ArrowLeft size={20} />
          Back to Orders
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Order Details */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Rate Your Order
            </h1>

            {order && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Order Number</p>
                    <h2 className="text-xl font-bold text-gray-900">
                      #{order.orderNumber}
                    </h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                    Completed
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Merchant</p>
                    <p className="font-semibold text-gray-900">
                      {order.merchantName}
                    </p>
                  </div>
                  {order.riderName && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Rider</p>
                      <p className="font-semibold text-gray-900">
                        {order.riderName}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ฿{order.totalAmount.toFixed(2)}
                  </p>
                </div>

                {order.completedAt && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed On</p>
                    <p className="text-gray-900">
                      {new Date(order.completedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rating Section */}
          <div className="mt-8">
            <p className="text-gray-600 mb-6">
              Please share your feedback about your experience with this order.
              Your ratings help us improve our service.
            </p>

            <button
              onClick={() => setShowRatingModal(true)}
              className="w-full rounded-lg bg-blue-600 px-6 py-4 font-bold text-white text-lg transition-colors hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <span>⭐</span>
              Open Rating Form
            </button>
          </div>

          {/* Info Banner */}
          <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
            <p>
              💡 Your feedback helps us improve. Please take a moment to rate
              both the merchant and rider.
            </p>
          </div>
        </div>
      </div>

      {/* Rating Modal */}
      {order && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          orderId={order.id}
          onSubmit={async (data) => {
            await handleRatingSubmit(data);
            // Redirect after successful submission
            setTimeout(() => {
              router.push("/customer");
            }, 1000);
          }}
        />
      )}
    </div>
  );
}
