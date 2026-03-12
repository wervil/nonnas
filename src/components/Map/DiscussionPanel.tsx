"use client";

import { useUser } from "@stackframe/stack";
import { ArrowLeft, Clock, Heart, MapPin, MessageCircle, Sparkles, Star, TrendingUp, Users, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreateThreadForm from "../Threads/CreateThreadForm";
import ThreadList from "../Threads/ThreadList";
import ThreadView from "../Threads/ThreadView";
import Button from "../ui/Button";

interface DiscussionPanelProps {
    isOpen: boolean;
    onClose: () => void;
    region: string;
    regionDisplayName: string;
    scope: "country" | "state" | "city";
    country?: string;
    state?: string;
    city?: string;
    nonnas: Array<{
        id: string | number;
        name: string;
        recipeTitle?: string;
        history?: string;
        photo?: string[] | null;
        origin?: string;
    }>;
    initialTab?: "discussion" | "nonnas";
}

export default function DiscussionPanel({
    isOpen,
    onClose,
    region,
    regionDisplayName,
    scope,
    country,
    state,
    city,
    nonnas,
    initialTab = "discussion",
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

    // Determine the icon and label based on scope
    const getScopeDisplay = () => {
        switch (scope) {
            case "country":
                return { icon: "🌍", label: "Country", color: "blue" };
            case "state":
                return { icon: "🏙️", label: "State/Region", color: "emerald" };
            case "city":
                return { icon: "🏘️", label: "City", color: "amber" };
            default:
                return { icon: "📍", label: "Location", color: "gray" };
        }
    };

    const scopeDisplay = getScopeDisplay();

    return (
        <div className="fixed top-15.75 sm:top-20 right-0 sm:h-[calc(100vh-80px)] h-[calc(100vh-63px)] w-full md:w-125 bg-white/95 backdrop-blur-xl shadow-2xl z-99999 border-l border-gray-100/80 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header with enhanced gradient and depth */}
            <div className="relative overflow-hidden">
                {/* Animated background layers */}
                <div className="absolute inset-0 bg-linear-to-br from-amber-50 via-orange-50/60 to-yellow-50/40" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-linear-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-linear-to-tr from-orange-400/15 to-yellow-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5">
                    <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(251 191 36) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                </div>

                <div className="relative px-6 py-6 border-b border-gray-100/80">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 via-orange-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/20">
                                    <span className="text-2xl filter drop-shadow-sm">{scopeDisplay.icon}</span>
                                    {/* Glow effect */}
                                    <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-amber-400/30 to-orange-400/30 blur-sm animate-pulse" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-(--font-bell) text-gray-900 leading-tight">
                                        {regionDisplayName}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full bg-linear-to-r from-${scopeDisplay.color}-500/20 to-${scopeDisplay.color}-400/20 text-${scopeDisplay.color}-700 border border-${scopeDisplay.color}-500/30 backdrop-blur-sm`}>
                                            {scopeDisplay.label}
                                        </span>
                                        <div className="flex items-center gap-1 text-amber-600">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-xs font-medium">Featured</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/80 backdrop-blur-sm hover:bg-white border border-gray-200/50 text-gray-500 hover:text-gray-700 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced tabs with glassmorphism effect */}
            <div className="flex border-b border-gray-100/80 bg-white/60 backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab("discussion")}
                    className={`flex-1 px-6 py-4 text-sm font-(--font-bell) transition-all duration-300 relative ${activeTab === "discussion"
                        ? "text-amber-700 bg-linear-to-b from-amber-50/50 to-transparent"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50/50"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2.5">
                        <MessageCircle className={`w-4.5 h-4.5 ${activeTab === "discussion" ? "text-amber-600" : ""}`} />
                        <span>Community</span>
                        {activeTab === "discussion" && (
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        )}
                    </div>
                    {activeTab === "discussion" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 shadow-lg shadow-amber-500/50" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("nonnas")}
                    className={`flex-1 px-6 py-4 text-sm font-(--font-bell) transition-all duration-300 relative ${activeTab === "nonnas"
                        ? "text-amber-700 bg-linear-to-b from-amber-50/50 to-transparent"
                        : "text-gray-600 hover:text-gray-800 hover:bg-gray-50/50"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2.5">
                        <Users className={`w-4.5 h-4.5 ${activeTab === "nonnas" ? "text-amber-600" : ""}`} />
                        <span>Nonnas</span>
                        {nonnas.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-700 font-bold border border-amber-500/30">
                                {nonnas.length}
                            </span>
                        )}
                    </div>
                    {activeTab === "nonnas" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-500 via-orange-500 to-yellow-500 shadow-lg shadow-amber-500/50" />
                    )}
                </button>
            </div>

            {/* Enhanced content with better spacing */}
            <div className="overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                {activeTab === "discussion" ? (
                    <div className="p-6 pb-24">
                        {viewMode === "list" && (
                            <>
                                {/* Enhanced header with stats */}
                                <div className="mb-8 p-5 rounded-3xl bg-linear-to-br from-amber-50/60 via-orange-50/40 to-yellow-50/30 border border-amber-200/50 backdrop-blur-sm">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-xl text-gray-900 flex items-center gap-3 font-(--font-bell)">
                                                <div className="w-8 h-8 rounded-xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                                    <Sparkles className="w-4.5 h-4.5 text-white" />
                                                </div>
                                                Community Hub
                                            </h3>
                                            <p className="text-gray-600 mt-2 font-(--font-bell)">
                                                Share stories, recipes, and connect with locals
                                            </p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <div className="flex items-center gap-1.5 text-amber-600">
                                                    <TrendingUp className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Active</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-500">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="text-sm">Updated recently</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {user ? (
                                        <div className="mt-4">
                                            <Button
                                                onClick={handleStartDiscussion}
                                                className="w-full bg-linear-to-r from-amber-500 via-orange-500 to-yellow-600 hover:from-amber-400 hover:via-orange-400 hover:to-yellow-500 text-white border-0 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <MessageCircle className="w-4.5 h-4.5" />
                                                    Start New Discussion
                                                </div>
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="mt-4">
                                            <Button
                                                onClick={() => router.push("/handler/sign-in")}
                                                className="w-full bg-white/80 backdrop-blur-sm text-amber-700 border border-amber-300/50 hover:bg-amber-50/80 font-bold"
                                            >
                                                <div className="flex items-center justify-center gap-2">
                                                    <Heart className="w-4.5 h-4.5" />
                                                    Sign In to Join
                                                </div>
                                            </Button>
                                        </div>
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
                                    className="flex items-center gap-2 text-gray-500 hover:text-amber-600 mb-6 transition-colors group font-(--font-bell)"
                                >
                                    <ArrowLeft className="w-4.5 h-4.5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-bold">Back to Community</span>
                                </button>
                                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-7 border border-gray-200/60 shadow-lg">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                            <MessageCircle className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-(--font-bell) text-gray-900">Start Discussion</h3>
                                            <p className="text-gray-600 font-(--font-bell)">
                                                Share your thoughts with the {regionDisplayName} community
                                            </p>
                                        </div>
                                    </div>
                                    <CreateThreadForm
                                        region={region}
                                        scope={scope}
                                        country={country}
                                        state={state}
                                        city={city}
                                        onSuccess={handleCreateSuccess}
                                    />
                                </div>
                            </div>
                        )}

                        {viewMode === "thread" && selectedThreadId && (
                            <div>
                                <button
                                    onClick={handleBackToList}
                                    className="flex items-center gap-2 text-gray-500 hover:text-amber-600 mb-6 transition-colors group font-(--font-bell)"
                                >
                                    <ArrowLeft className="w-4.5 h-4.5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-bold">Back to Community</span>
                                </button>
                                <ThreadView
                                    threadId={selectedThreadId}
                                    currentUserId={user?.id}
                                    isAuthenticated={!!user}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6">
                        {nonnas.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-linear-to-br from-amber-100/60 via-orange-100/40 to-yellow-100/30 flex items-center justify-center border border-amber-200/50">
                                    <span className="text-5xl filter drop-shadow-sm">👵</span>
                                </div>
                                <h3 className="text-2xl font-(--font-bell) text-gray-900 mb-3">No Nonnas Yet</h3>
                                <p className="text-gray-600 mb-2 font-(--font-bell)">
                                    No grandmothers have shared recipes from this area yet.
                                </p>
                                <p className="text-sm text-gray-500 font-(--font-bell)">
                                    Be the first to share a recipe from {regionDisplayName}!
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Enhanced stats header */}
                                <div className="p-6 rounded-3xl bg-linear-to-br from-amber-50/60 via-orange-50/40 to-yellow-50/30 border border-amber-200/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-amber-500 via-orange-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/20">
                                            <Users className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-3xl font-(--font-bell) text-gray-900">{nonnas.length}</div>
                                            <div className="text-gray-600 font-(--font-bell)">
                                                {nonnas.length === 1 ? "Nonna" : "Nonnas"} in {regionDisplayName}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Heart className="w-4 h-4 text-red-500 fill-current" />
                                                <span className="text-sm text-amber-600 font-medium">Sharing traditions</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Nonna cards */}
                                {nonnas.map((nonna, index) => (
                                    <div
                                        key={nonna.id}
                                        className="group relative bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200/60 overflow-hidden hover:border-amber-400/60 hover:shadow-2xl hover:shadow-amber-500/15 transition-all duration-500 hover:scale-[1.02]"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex">
                                            {/* Enhanced Photo */}
                                            <div className="relative shrink-0 w-32 h-32 bg-linear-to-br from-amber-900/40 to-orange-900/40 flex items-center justify-center overflow-hidden">
                                                {nonna.photo && nonna.photo.length > 0 && nonna.photo[0] && nonna.photo[0].trim() !== '' ? (
                                                    <Image
                                                        src={nonna.photo[0]}
                                                        alt={nonna.name}
                                                        fill
                                                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                                                        sizes="128px"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : (
                                                    <span className="text-5xl opacity-60 filter drop-shadow-sm">👵</span>
                                                )}
                                            </div>

                                            {/* Enhanced Info */}
                                            <div className="flex-1 p-5 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-(--font-bell) text-xl text-gray-900 truncate group-hover:text-amber-600 transition-colors">
                                                            {nonna.name}
                                                        </h3>
                                                        {nonna.recipeTitle && (
                                                            <p className="text-sm font-(--font-bell) mt-2 text-amber-600/90 truncate">
                                                                🍝 {nonna.recipeTitle}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {nonna.origin && (
                                                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 font-(--font-bell)">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="truncate">{nonna.origin}</span>
                                                    </div>
                                                )}

                                                {nonna.history && (
                                                    <p className="mt-3 text-sm text-gray-600 line-clamp-3 leading-relaxed font-(--font-bell)">
                                                        {nonna.history}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Enhanced view recipe button */}
                                        <div className="absolute bottom-4 right-4">
                                            <button
                                                onClick={() => handleViewRecipe(nonna.id)}
                                                className="px-5 py-2.5 text-sm text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer bg-linear-to-r from-amber-500 via-orange-500 to-yellow-600 hover:from-amber-400 hover:via-orange-400 hover:to-yellow-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 font-(--font-bell)"
                                            >
                                                <div className="flex items-center gap-2">
                                                    View Recipe
                                                    <Star className="w-3.5 h-3.5" />
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Enhanced custom scrollbar styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: linear-gradient(to bottom, transparent, rgba(251, 191, 36, 0.05), transparent);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, rgba(251, 191, 36, 0.4), rgba(251, 146, 60, 0.4));
                    border-radius: 4px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, rgba(251, 191, 36, 0.6), rgba(251, 146, 60, 0.6));
                }
                @keyframes slide-in-from-right {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-in.slide-in-from-right {
                    animation: slide-in-from-right 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}