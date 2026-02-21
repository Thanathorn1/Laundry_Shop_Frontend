"use client";

import React, { FormEvent, useState } from "react";
import BottomSheet from "./BottomSheet";
import StarRating from "./StarRating";
import { AlertCircle, CheckCircle } from "lucide-react";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSubmit: (data: RatingData) => Promise<void>;
}

export interface RatingData {
  orderId: string;
  merchantRating: number;
  riderRating: number;
  merchantComment?: string;
  riderComment?: string;
}

type SubmissionStatus = "idle" | "loading" | "success" | "error";

export default function RatingModal({
  isOpen,
  onClose,
  orderId,
  onSubmit,
}: RatingModalProps) {
  const [merchantRating, setMerchantRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [merchantComment, setMerchantComment] = useState("");
  const [riderComment, setRiderComment] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (merchantRating === 0 || riderRating === 0) {
      setError("Please rate both merchant and rider");
      return;
    }

    try {
      setStatus("loading");
      setError(null);

      await onSubmit({
        orderId,
        merchantRating,
        riderRating,
        merchantComment: merchantComment.trim() || undefined,
        riderComment: riderComment.trim() || undefined,
      });

      setStatus("success");
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to submit rating"
      );
    }
  };

  const handleClose = () => {
    if (status !== "loading") {
      setMerchantRating(0);
      setRiderRating(0);
      setMerchantComment("");
      setRiderComment("");
      setStatus("idle");
      setError(null);
      onClose();
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Rate Your Order"
      showCloseButton={status !== "loading"}
    >
      {status === "success" ? (
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <CheckCircle size={48} className="text-green-500" />
          <h3 className="text-xl font-semibold text-gray-900">
            Thank you!
          </h3>
          <p className="text-gray-600">
            Your rating has been submitted successfully
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="flex gap-3 rounded-lg bg-red-50 p-4">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Merchant Rating */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Rate the Merchant
              </h3>
              <p className="text-sm text-gray-500">
                How was your experience with the shop?
              </p>
            </div>
            <StarRating
              rating={merchantRating}
              onRatingChange={setMerchantRating}
              size="lg"
            />
            <textarea
              value={merchantComment}
              onChange={(e) => setMerchantComment(e.target.value)}
              placeholder="Share your feedback (optional)"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              rows={3}
            />
          </div>

          {/* Rider Rating */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Rate the Rider
              </h3>
              <p className="text-sm text-gray-500">
                How was the delivery service?
              </p>
            </div>
            <StarRating
              rating={riderRating}
              onRatingChange={setRiderRating}
              size="lg"
            />
            <textarea
              value={riderComment}
              onChange={(e) => setRiderComment(e.target.value)}
              placeholder="Share your feedback (optional)"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {status === "loading" ? "Submitting..." : "Submit Rating"}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
