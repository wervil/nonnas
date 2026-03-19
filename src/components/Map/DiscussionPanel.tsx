"use client";

import { useUser } from "@stackframe/stack";
import { ArrowLeft, MapPin, MessageCircle, Users, X } from "lucide-react";
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

    const getScopeDisplay = () => {
        switch (scope) {
            case "country":
                return { label: "Country" };
            case "state":
                return { label: "State" };
            case "city":
                return { label: "City" };
            default:
                return { label: "Location" };
        }
    };

    const scopeDisplay = getScopeDisplay();

    return (
        <div className="fixed top-15.75 sm:top-20 right-0 sm:h-[calc(100vh-80px)] h-[calc(100vh-63px)] w-full md:w-125 bg-white shadow-lg z-99999 border-l border-gray-200 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">
                                {regionDisplayName}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {scopeDisplay.label}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("discussion")}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "discussion"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        <span>Community</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("nonnas")}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === "nonnas"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Nonnas</span>
                        {nonnas.length > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                {nonnas.length}
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 min-h-0">
                {activeTab === "discussion" ? (
                    <div className="p-6">
                        {viewMode === "list" && (
                            <>
                                {/* Header */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Regional Discussions
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        Share stories, recipes, and connect with locals
                                    </p>
                                    {user ? (
                                        <Button
                                            onClick={handleStartDiscussion}
                                            className="w-full"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <MessageCircle className="w-4 h-4" />
                                                Start New Discussion
                                            </div>
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => router.push("/handler/sign-in")}
                                            className="w-full"
                                        >
                                            Sign In to Join
                                        </Button>
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
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to Community</span>
                                </button>
                                <div className="bg-white rounded-lg border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Start Discussion
                                    </h3>
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
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to Community</span>
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
                            <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    No Nonnas Yet
                                </h3>
                                <p className="text-sm text-gray-600">
                                    No grandmothers have shared recipes from this area yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Stats header */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {nonnas.length} {nonnas.length === 1 ? "Nonna" : "Nonnas"} in {regionDisplayName}
                                    </h3>
                                </div>

                                {/* Nonna cards */}
                                {nonnas.map((nonna) => (
                                    <div
                                        key={nonna.id}
                                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex">
                                            {/* Photo */}
                                            <div className="relative shrink-0 w-24 h-24 bg-gray-100 flex items-center justify-center">
                                                {nonna.photo && nonna.photo.length > 0 && nonna.photo[0] && nonna.photo[0].trim() !== '' ? (
                                                    <Image
                                                        src={nonna.photo[0]}
                                                        alt={nonna.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="96px"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <Users className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 p-4 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">
                                                    {nonna.name}
                                                </h3>
                                                {nonna.recipeTitle && (
                                                    <p className="text-sm text-gray-600 mt-1 truncate">
                                                        {nonna.recipeTitle}
                                                    </p>
                                                )}
                                                {nonna.origin && (
                                                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{nonna.origin}</span>
                                                    </div>
                                                )}
                                                {nonna.history && (
                                                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                                        {nonna.history}
                                                    </p>
                                                )}
                                                <button
                                                    onClick={() => handleViewRecipe(nonna.id)}
                                                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                >
                                                    View Recipe →
                                                </button>
                                            </div>
                                        </div>
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