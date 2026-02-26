"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Responsive Sheet/Modal Container */}
      <div className="fixed inset-0 z-[210] flex items-end justify-center pointer-events-none sm:items-center p-4">
        <div className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-premium glass-morphism border border-white/20 pointer-events-auto animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-300 flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-50/10 bg-white/80 backdrop-blur-xl px-6 py-4">
            {title && (
              <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto rounded-xl p-2 hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}
