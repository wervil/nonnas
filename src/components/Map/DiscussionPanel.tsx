"use client";

import { useUser } from "@stackframe/stack";
import { ArrowLeft, MapPin, MessageCircle, Send, Users, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [viewMode, selectedThreadId]);

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
        <div className="fixed top-15.75 sm:top-20 right-0 sm:h-[calc(100vh-80px)] h-[calc(100vh-63px)] w-full md:w-125 shadow-lg z-99999 border-l border-gray-200 flex flex-col"
            style={{ background: "#EDF2F7" }}
        >
            {/* Header — styled like a phone messaging app header */}
            <div
                className="shrink-0 px-4 py-3 flex items-center justify-between border-b"
                style={{
                    background: "linear-gradient(135deg, #4A90D9 0%, #5BA0E8 100%)",
                    borderColor: "rgba(255,255,255,0.15)",
                }}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-white truncate">
                            {regionDisplayName}
                        </h2>
                        <p className="text-xs text-blue-100 truncate">
                            {scopeDisplay.label} Chat
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs — pill style */}
            <div className="shrink-0 flex gap-2 px-4 py-2.5" style={{ background: "#E2E8F0" }}>
                <button
                    onClick={() => { setActiveTab("discussion"); setViewMode("list"); setSelectedThreadId(null); }}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === "discussion"
                        ? "bg-[#4A90D9] text-white shadow-sm"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                >
                    <div className="flex items-center justify-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Community</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("nonnas")}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-all ${activeTab === "nonnas"
                        ? "bg-[#4A90D9] text-white shadow-sm"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                >
                    <div className="flex items-center justify-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Nonnas</span>
                        {nonnas.length > 0 && (
                            <span className={`ml-0.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === "nonnas"
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-500"
                                }`}>
                                {nonnas.length}
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 min-h-0" ref={scrollRef}>
                {activeTab === "discussion" ? (
                    <div className="p-4">
                        {viewMode === "list" && (
                            <>
                                {/* Welcome bubble — blue (left aligned, like received message) */}
                                <div className="flex justify-start mb-4">
                                    <div
                                        className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                                        style={{ background: "#4A90D9", color: "white" }}
                                    >
                                        <p className="text-sm font-medium mb-1">Regional Discussions</p>
                                        <p className="text-xs text-blue-100">
                                            Share stories, recipes, and connect with locals from {regionDisplayName}
                                        </p>
                                    </div>
                                </div>

                                {/* Action bubble — yellow (right aligned, like sent message) */}
                                <div className="flex justify-end mb-5">
                                    <div
                                        className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 shadow-sm"
                                        style={{ background: "#F2C94C", color: "#333" }}
                                    >
                                        {user ? (
                                            <button
                                                onClick={handleStartDiscussion}
                                                className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                Start New Discussion
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => router.push("/handler/sign-in")}
                                                className="text-sm font-medium hover:opacity-80 transition-opacity"
                                            >
                                                Sign In to Join the Chat
                                            </button>
                                        )}
                                    </div>
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
                                {/* Back button as a blue bubble */}
                                <div className="flex justify-start mb-4">
                                    <button
                                        onClick={handleBackToList}
                                        className="flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-white hover:opacity-90 transition-opacity shadow-sm"
                                        style={{ background: "#4A90D9" }}
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>Back to Community</span>
                                    </button>
                                </div>

                                {/* Form in a yellow bubble */}
                                <div className="flex justify-end mb-4">
                                    <div
                                        className="max-w-[95%] w-full rounded-2xl rounded-br-md px-4 py-4 shadow-sm"
                                        style={{ background: "#F2C94C" }}
                                    >
                                        <h3 className="text-sm font-semibold text-gray-800 mb-3">
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
                            </div>
                        )}

                        {viewMode === "thread" && selectedThreadId && (
                            <div>
                                {/* Back button as a blue bubble */}
                                <div className="flex justify-start mb-4">
                                    <button
                                        onClick={handleBackToList}
                                        className="flex items-center gap-2 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-white hover:opacity-90 transition-opacity shadow-sm"
                                        style={{ background: "#4A90D9" }}
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>Back to Community</span>
                                    </button>
                                </div>

                                <ThreadView
                                    threadId={selectedThreadId}
                                    currentUserId={user?.id}
                                    isAuthenticated={!!user}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-4">
                        {nonnas.length === 0 ? (
                            /* Empty state as a blue bubble */
                            <div className="flex justify-start">
                                <div
                                    className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-4 shadow-sm"
                                    style={{ background: "#4A90D9", color: "white" }}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-white" />
                                        </div>
                                        <h3 className="text-sm font-semibold">No Nonnas Yet</h3>
                                    </div>
                                    <p className="text-xs text-blue-100">
                                        No grandmothers have shared recipes from this area yet.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Stats header as blue bubble */}
                                <div className="flex justify-start mb-3">
                                    <div
                                        className="rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm"
                                        style={{ background: "#4A90D9", color: "white" }}
                                    >
                                        <p className="text-sm font-medium">
                                            {nonnas.length} {nonnas.length === 1 ? "Nonna" : "Nonnas"} in {regionDisplayName}
                                        </p>
                                    </div>
                                </div>

                                {/* Nonna cards as alternating blue/yellow bubbles */}
                                {nonnas.map((nonna, index) => {
                                    const isEven = index % 2 === 0;
                                    return (
                                        <div
                                            key={nonna.id}
                                            className={`flex ${isEven ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[88%] rounded-2xl ${isEven ? "rounded-br-md" : "rounded-bl-md"} overflow-hidden shadow-sm`}
                                                style={{
                                                    background: isEven ? "#F2C94C" : "#4A90D9",
                                                    color: isEven ? "#333" : "white",
                                                }}
                                            >
                                                <div className="flex">
                                                    {/* Photo */}
                                                    <div className="relative shrink-0 w-20 h-20 flex items-center justify-center"
                                                        style={{ background: isEven ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.15)" }}
                                                    >
                                                        {nonna.photo && nonna.photo.length > 0 && nonna.photo[0] && nonna.photo[0].trim() !== '' ? (
                                                            <Image
                                                                src={nonna.photo[0]}
                                                                alt={nonna.name}
                                                                fill
                                                                className="object-cover"
                                                                sizes="80px"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <Users className="w-7 h-7" style={{ opacity: 0.5 }} />
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 p-3 min-w-0">
                                                        <h3 className="font-semibold text-sm truncate">
                                                            {nonna.name}
                                                        </h3>
                                                        {nonna.recipeTitle && (
                                                            <p className="text-xs mt-0.5 truncate" style={{ opacity: 0.8 }}>
                                                                {nonna.recipeTitle}
                                                            </p>
                                                        )}
                                                        {nonna.origin && (
                                                            <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ opacity: 0.7 }}>
                                                                <MapPin className="w-3 h-3" />
                                                                <span className="truncate">{nonna.origin}</span>
                                                            </div>
                                                        )}
                                                        {nonna.history && (
                                                            <p className="mt-1.5 text-xs line-clamp-2" style={{ opacity: 0.85 }}>
                                                                {nonna.history}
                                                            </p>
                                                        )}
                                                        <button
                                                            onClick={() => handleViewRecipe(nonna.id)}
                                                            className="mt-2 text-xs font-medium hover:opacity-80 transition-opacity"
                                                            style={{
                                                                color: isEven ? "#2D6BB4" : "#F2C94C",
                                                            }}
                                                        >
                                                            View Recipe →
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
