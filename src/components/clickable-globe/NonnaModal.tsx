"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Nonna } from "./sharedTypes";
import ThreadList from "../Threads/ThreadList";

export default function NonnaModal({
  open,
  title,
  nonnas,
  onClose,
  themeColor = "#ef4444",
  region,
  scope = "country",
}: {
  open: boolean;
  title: string;
  nonnas: Nonna[];
  onClose: () => void;
  themeColor?: string;
  region?: string;
  scope?: "country" | "state";
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"recipes" | "community">("recipes");

  const handleViewRecipe = useCallback((recipeId: string | number) => {
    // Close the modal first
    onClose();
    // Navigate to home page with recipe ID to open flipbook at that recipe's page
    router.push(`/?recipe=${recipeId}`);
  }, [onClose, router]);

  const handleStartDiscussion = useCallback(() => {
    if (!region) return;
    router.push(`/community/create?region=${encodeURIComponent(region)}&scope=${scope}`);
  }, [region, scope, router]);

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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />

      {/* Modal - Dark Theme */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 border border-white/10">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-b border-white/10 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">👵</span>
                <h2 className="text-lg font-bold text-white">{title}</h2>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                {scope === "country" ? "Country" : "State"} Level
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white shadow-sm border border-white/10 transition-all duration-150"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 bg-black/30">
          <button
            onClick={() => setActiveTab("recipes")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "recipes"
                ? "text-amber-500 border-b-2 border-amber-500 bg-white/5"
                : "text-gray-400 hover:text-gray-300"
              }`}
          >
            Recipes ({nonnas.length})
          </button>
          <button
            onClick={() => setActiveTab("community")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "community"
                ? "text-amber-500 border-b-2 border-amber-500 bg-white/5"
                : "text-gray-400 hover:text-gray-300"
              }`}
          >
            Community
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-6">
          {activeTab === "recipes" ? (
            <>
              {nonnas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🍝</div>
                  <p className="text-gray-400">No nonnas found in this area.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {nonnas.map((nonna, idx) => (
                    <div
                      key={nonna.id}
                      className="group relative bg-black/30 rounded-xl border border-white/10 overflow-hidden hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex">
                        {/* Photo */}
                        <div className="relative flex-shrink-0 w-24 h-24 bg-gradient-to-br from-amber-900/30 to-orange-900/30 flex items-center justify-center overflow-hidden">
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
                              <h3 className="font-bold text-white">{nonna.name}</h3>
                              {nonna.recipeTitle && (
                                <p className="text-sm font-medium mt-0.5" style={{ color: themeColor }}>
                                  {nonna.recipeTitle}
                                </p>
                              )}
                            </div>
                            {nonna.origin && (
                              <span className="flex-shrink-0 text-xs text-gray-400 bg-white/10 px-2 py-1 rounded-full">
                                📍 {nonna.origin}
                              </span>
                            )}
                          </div>

                          {nonna.history && (
                            <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                              {nonna.history}
                            </p>
                          )}

                          {nonna.tagline && !nonna.history && (
                            <p className="mt-2 text-sm text-gray-400 italic line-clamp-2">
                              &ldquo;{nonna.tagline}&rdquo;
                            </p>
                          )}

                          {nonna.traditions && (
                            <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                              🎄 {nonna.traditions}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* View recipe link */}
                      {nonna.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRecipe(nonna.id);
                          }}
                          className="absolute bottom-0 right-0 px-3 py-1 text-xs font-medium text-white rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:brightness-110"
                          style={{ backgroundColor: themeColor }}
                        >
                          View Recipe →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  Regional Discussions
                </h3>
                {region && (
                  <button
                    onClick={handleStartDiscussion}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-500 transition-colors text-sm font-medium"
                  >
                    + Start Discussion
                  </button>
                )}
              </div>
              {region ? (
                <ThreadList region={region} scope={scope} />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  No region selected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-black/50 border-t border-white/10 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
