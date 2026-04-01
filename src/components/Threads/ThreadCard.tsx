'use client'

import { Thread } from '@/db/schema';
import { Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from "next/navigation";

interface ThreadCardProps {
    thread: Thread
    onClick?: (threadId: number) => void
}

export default function ThreadCard({ thread, onClick }: ThreadCardProps) {

    const pathname = usePathname();
    const isProfilePage = pathname === "/profile";

    const formatDate = (date: Date | null) => {
        if (!date) return ''
        const threadDate = new Date(date)

        return threadDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
    }

    const content = (
        <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer">
            <div className="flex items-start gap-3">
                {/* Category icon */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-[#9BC9C3]/20 flex items-center justify-center text-lg">
                    💬
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-base font-semibold line-clamp-1 text-gray-900 mb-1">
                        {thread.title}
                    </h3>

                    {/* Content preview */}
                    <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                        {thread.content}
                    </p>

                    {/* Footer stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </div>
                            <span>View</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4" />
                            <span>Reply</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(thread.created_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Scope Badge */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span
                        className={`px-1.5 py-0.5 rounded text-[12px] font-medium border bg-[#9BC9C3]/20 text-[#4A7C7A] border-[#9BC9C3]/40`}
                    >
                        {thread.scope === 'country' ? '🌍 Country' : thread.scope === 'city' ? '📍 City' : '📍 State'}
                    </span>

                </div>


            </div>
        </div>
    )

    if (onClick) {
        return (
            <div onClick={() => onClick(thread.id)}>
                {content}
            </div>
        )
    }

    return (
        <Link
            href={`/community/thread/${thread.id}`}
            target={isProfilePage ? "_blank" : undefined}
        >
            {content}
        </Link>
    )
}