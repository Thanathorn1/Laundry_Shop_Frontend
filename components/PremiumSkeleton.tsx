"use client";

import React from "react";

interface PremiumSkeletonProps {
    className?: string;
    variant?: "rect" | "circle" | "text";
}

export default function PremiumSkeleton({ className = "", variant = "rect" }: PremiumSkeletonProps) {
    const baseClass = "relative overflow-hidden bg-slate-200/50 glass-morphism";

    const variantClasses = {
        rect: "rounded-2xl",
        circle: "rounded-full",
        text: "rounded-lg h-4 w-full"
    };

    return (
        <div className={`${baseClass} ${variantClasses[variant]} ${className}`}>
            <div className="absolute inset-0 shimmer" />
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="glass-deep rounded-[2rem] p-6 border border-white/40 shadow-premium space-y-4">
            <PremiumSkeleton className="aspect-[16/9] w-full" />
            <div className="space-y-2">
                <PremiumSkeleton variant="text" className="w-3/4 h-6" />
                <PremiumSkeleton variant="text" className="w-1/2" />
            </div>
            <PremiumSkeleton className="h-12 w-full mt-4" />
        </div>
    );
}
