"use client";

import React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const sizeMap = {
    sm: { icon: 20, container: "gap-1" },
    md: { icon: 32, container: "gap-2" },
    lg: { icon: 40, container: "gap-3" },
  };

  const { icon, container } = sizeMap[size];

  return (
    <div className={`flex ${container}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => !readonly && onRatingChange(star)}
          disabled={readonly}
          className={`rounded-lg transition-transform ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            size={icon}
            className={`transition-colors ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
