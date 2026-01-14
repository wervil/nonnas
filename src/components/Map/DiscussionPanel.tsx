"use client";

import { useState } from "react";
// Remove next/navigation router usage for internal navigation if possible, but handleViewRecipe still needs it? Yes.
import { useRouter } from "next/navigation";
import { X, ArrowLeft } from "lucide-react";
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
}

export default function DiscussionPanel({
    isOpen,
    onClose,
    region,
    regionDisplayName,
    scope,
    nonnas,
}: DiscussionPanelProps) {
    const router = useRouter();
    const user = useUser();
    const [activeTab, setActiveTab] = useState<"discussion" | "nonnas">("discussion");
    const [viewMode, setViewMode] = useState<"list" | "create" | "thread">("list");
    const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

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
        <div className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#1a1a1a] shadow-2xl z-[9999] border-l border-white/10 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-b border-white/10 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🌍</span>
                            <h2 className="text-lg font-bold text-white">{regionDisplayName}</h2>
                        </div>
                        <p className="text-sm text-gray-300 mt-1">
                            {scope === "country" ? "Country" : "State"} Level
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-all"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/30">
                <button
                    onClick={() => setActiveTab("discussion")}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "discussion"
                        ? "text-amber-500 border-b-2 border-amber-500 bg-white/5"
                        : "text-gray-400 hover:text-gray-300"
                        }`}
                >
                    Discussion
                </button>
                <button
                    onClick={() => setActiveTab("nonnas")}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "nonnas"
                        ? "text-amber-500 border-b-2 border-amber-500 bg-white/5"
                        : "text-gray-400 hover:text-gray-300"
                        }`}
                >
                    Nonnas ({nonnas.length})
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto h-[calc(100vh-140px)] p-6">
                {activeTab === "discussion" ? (
                    <div>
                        {viewMode === "list" && (
                            <>
                                <div className="mb-4 flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">
                                        Regional Discussions
                                    </h3>
                                    <button
                                        onClick={handleStartDiscussion}
                                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-500 transition-colors text-sm font-medium"
                                    >
                                        + Start Discussion
                                    </button>
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
                                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to list</span>
                                </button>
                                <div className="bg-white rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Start a Discussion</h3>
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
                                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to list</span>
                                </button>
                                <ThreadView
                                    threadId={selectedThreadId}
                                    currentUserId={user?.id}
                                    isAuthenticated={!!user}
                                    onBack={handleBackToList}
                                    hideBackButton={true}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {nonnas.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">🍝</div>
                                <p className="text-gray-400 mb-2">No Nonnas found in this area yet.</p>
                                <p className="text-sm text-gray-500">
                                    Be the first to share a recipe from {regionDisplayName}!
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {nonnas.map((nonna) => (
                                    <div
                                        key={nonna.id}
                                        className="group relative bg-black/30 rounded-xl border border-white/10 overflow-hidden hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200"
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
                                                            <p className="text-sm font-medium mt-0.5 text-amber-500">
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
                                            </div>
                                        </div>

                                        {/* View recipe link */}
                                        <button
                                            onClick={() => handleViewRecipe(nonna.id)}
                                            className="absolute bottom-0 right-0 px-3 py-1 text-xs font-medium text-white rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:brightness-110 bg-amber-600"
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
        </div>
    );
}
