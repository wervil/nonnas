"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import type { Nonna } from "./sharedTypes";

export default function NonnaModal({
  open,
  title,
  nonnas,
  onClose,
  themeColor = "#ef4444",
}: {
  open: boolean;
  title: string;
  nonnas: Nonna[];
  onClose: () => void;
  themeColor?: string;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/50 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👵</span>
                <h2 className="text-lg font-bold text-gray-900">Nonnas</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{nonnas.length} result(s)</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 shadow-sm border border-gray-200/50 transition-all duration-150"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-100px)] p-6">
          {nonnas.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🍝</div>
              <p className="text-gray-500">No nonnas found in this area.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {nonnas.map((nonna, idx) => (
                <div
                  key={nonna.id}
                  className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-amber-300 hover:shadow-lg transition-all duration-200"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex">
                    {/* Photo */}
                    <div className="relative flex-shrink-0 w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center overflow-hidden">
                      {nonna.photo && nonna.photo.length > 0 ? (
                        <Image 
                          src={nonna.photo[0]} 
                          alt={nonna.name} 
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <span className="text-3xl">👵</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{nonna.name}</h3>
                          {nonna.recipeTitle && (
                            <p className="text-sm font-medium mt-0.5" style={{ color: themeColor }}>
                              {nonna.recipeTitle}
                            </p>
                          )}
                        </div>
                        {nonna.origin && (
                          <span className="flex-shrink-0 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            📍 {nonna.origin}
                          </span>
                        )}
                      </div>

                      {nonna.history && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {nonna.history}
                        </p>
                      )}

                      {nonna.tagline && !nonna.history && (
                        <p className="mt-2 text-sm text-gray-500 italic line-clamp-2">
                          &ldquo;{nonna.tagline}&rdquo;
                        </p>
                      )}

                      {nonna.traditions && (
                        <p className="mt-1 text-xs text-gray-400 line-clamp-1">
                          🎄 {nonna.traditions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* View recipe link */}
                  {nonna.id && (
                    <div 
                      className="absolute bottom-0 right-0 px-3 py-1 text-xs font-medium text-white rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      style={{ backgroundColor: themeColor }}
                    >
                      View Recipe →
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
