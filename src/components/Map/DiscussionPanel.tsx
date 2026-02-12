"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowLeft, MapPin, Users, MessageCircle, Sparkles } from "lucide-react";
import ThreadList from "../Threads/ThreadList";
import Image from "next/image";
import { useUser } from "@stackframe/stack";
import CreateThreadForm from "../Threads/CreateThreadForm";
import ThreadView from "../Threads/ThreadView";

interface DiscussionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    region: string;
    regionDisplayName: string;
    scope: "country" | "state";
    nonnas: Array<{
        id: string | number;
        name: string;
        recipeTitle?: string;
        history?: string;
        photo?: string[] | null;
        origin?: string;
    }>;
    initialTab?: "discussion" | "nonnas"; // NEW: Control which tab opens by default
}

export default function DiscussionPanel({
    isOpen,
    onClose,
    region,
    regionDisplayName,
    scope,
    nonnas,
    initialTab = "discussion", // Default to discussion tab
}: DiscussionPanelProps) {
    const router = useRouter();
    const user = useUser();
    const [activeTab, setActiveTab] = useState<"discussion" | "nonnas">(initialTab);
    const [viewMode, setViewMode] = useState<"list" | "create" | "thread">("list");
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

    // Reset tab when initialTab prop changes (e.g., when panel reopens)
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const handleViewRecipe = (recipeId: string | number) => {
        router.push(`/?recipe=${recipeId}`);
    };

    const handleStartDiscussion = () => {
        setViewMode("create");
    };

    const handleThreadClick = (threadId: number) => {
        setSelectedThreadId(threadId);
        setViewMode("thread");
    };

    const handleBackToList = () => {
        setViewMode("list");
        setSelectedThreadId(null);
    };

    const handleCreateSuccess = () => {
        setViewMode("list");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed top-[63px] sm:top-[80px] right-0 sm:h-[calc(100vh-80px)] h-[calc(100vh-63px)] w-full md:w-[480px] bg-white shadow-2xl z-[99999] border-l border-gray-200 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header with beautiful gradient */}
            <div className="relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-transparent" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />

                <div className="relative px-6 py-5 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                    {scope === "country" ? (
                                        <span className="text-xl">🌍</span>
                                    ) : (
                                        <MapPin className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                        {regionDisplayName}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scope === "country"
                                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                            }`}>
                                            {scope === "country" ? "Country" : "State/Region"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 hover:text-gray-700 transition-all duration-200"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs with glow effect */}
            <div className="flex border-b border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => setActiveTab("discussion")}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${activeTab === "discussion"
                        ? "text-amber-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Discussion</span>
                    </div>
                    {activeTab === "discussion" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("nonnas")}
                    className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${activeTab === "nonnas"
                        ? "text-amber-600"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Nonnas</span>
                        {nonnas.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 font-bold">
                                {nonnas.length}
                            </span>
                        )}
                    </div>
                    {activeTab === "nonnas" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                {activeTab === "discussion" ? (
                    <div className="p-6 pb-24">
                        {viewMode === "list" && (
                            <>
                                {/* Header with action button */}
                                <div className="mb-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-amber-500" />
                                            Regional Discussions
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Connect with the community
                                        </p>
                                    </div>
                                    {user ? (
                                        <button
                                            onClick={handleStartDiscussion}
                                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all duration-200 text-sm font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 active:scale-95"
                                        >
                                            + Start Discussion
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => router.push("/handler/sign-in")}
                                            className="px-4 py-2.5 bg-gray-50 text-amber-600 border border-amber-500/30 rounded-xl hover:bg-amber-50 transition-all duration-200 text-sm font-semibold"
                                        >
                                            Log in to start discussion
                                        </button>
                                    )}
                                </div>
                                <ThreadList
                                    region={region}
                                    scope={scope}
                                    onThreadClick={handleThreadClick}
                                />
                            </>
                        )}

                        {viewMode === "create" && (
                            <div>
                                <button
                                    onClick={handleBackToList}
                                    className="flex items-center gap-2 text-gray-400 hover:text-amber-400 mb-6 transition-colors group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-medium">Back to discussions</span>
                                </button>
                                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5 text-amber-500" />
                                        Start a Discussion
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-6">
                                        Share your thoughts with the {regionDisplayName} community
                                    </p>
                                    <CreateThreadForm
                                        region={region}
                                        scope={scope}
                                        onSuccess={handleCreateSuccess}
                                    />
                                </div>
                            </div>
                        )}

                        {viewMode === "thread" && selectedThreadId && (
                            <div>
                                <button
                                    onClick={handleBackToList}
                                    className="flex items-center gap-2 text-gray-400 hover:text-amber-400 mb-6 transition-colors group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-medium">Back to discussions</span>
                                </button>
                                <ThreadView
                                    threadId={selectedThreadId}
                                    currentUserId={user?.id}
                                    isAuthenticated={!!user}
                                // onBack={handleBackToList}
                                // hideBackButton={true}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6">
                        {nonnas.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                    <span className="text-4xl">👵</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">No Nonnas Yet</h3>
                                <p className="text-gray-500 mb-1">
                                    No grandmothers have shared recipes from this area yet.
                                </p>
                                <p className="text-sm text-gray-500">
                                    Be the first to share a recipe from {regionDisplayName}!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Stats header */}
                                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-gray-900">{nonnas.length}</div>
                                        <div className="text-sm text-gray-500">
                                            {nonnas.length === 1 ? "Nonna" : "Nonnas"} in {regionDisplayName}
                                        </div>
                                    </div>
                                </div>

                                {/* Nonna cards */}
                                {nonnas.map((nonna, index) => (
                                    <div
                                        key={nonna.id}
                                        className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className="flex">
                                            {/* Photo */}
                                            <div className="relative flex-shrink-0 w-28 h-28 bg-gradient-to-br from-amber-900/40 to-orange-900/40 flex items-center justify-center overflow-hidden">
                                                {nonna.photo && nonna.photo.length > 0 ? (
                                                    <Image
                                                        src={nonna.photo[0]}
                                                        alt={nonna.name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                        sizes="112px"
                                                    />
                                                ) : (
                                                    <span className="text-4xl opacity-60">👵</span>
                                                )}
                                                {/* Overlay gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 p-4 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-gray-900 text-lg truncate group-hover:text-amber-600 transition-colors">
                                                            {nonna.name}
                                                        </h3>
                                                        {nonna.recipeTitle && (
                                                            <p className="text-sm font-medium mt-1 text-amber-600/80 truncate">
                                                                🍝 {nonna.recipeTitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {nonna.origin && (
                                                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{nonna.origin}</span>
                                                    </div>
                                                )}

                                                {nonna.history && (
                                                    <p className="mt-2 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                                                        {nonna.history}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* View recipe button */}
                                        <button
                                            onClick={() => handleViewRecipe(nonna.id)}
                                            className="absolute bottom-3 right-3 px-4 py-2 text-xs font-bold text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95"
                                        >
                                            View Recipe →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Custom scrollbar styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(251, 191, 36, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(251, 191, 36, 0.5);
                }
            `}</style>
        </div>
    );
}
