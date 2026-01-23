'use client'

import Link from 'next/link'
import { Thread } from '@/db/schema'
import { MessageSquare, Eye, Clock, ChevronRight } from 'lucide-react'
import { usePathname } from "next/navigation";

interface ThreadCardProps {
    thread: Thread
    onClick?: (threadId: number) => void
}

export default function ThreadCard({ thread, onClick }: ThreadCardProps) {
    const getScopeBadgeStyle = (scope: string) => {
        return scope === 'country'
            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    }


        const pathname = usePathname();
        const isProfilePage = pathname === "/profile";

    const getCategoryIcon = (category: string) => {
        switch (category?.toLowerCase()) {
            case 'recipes':
                return '🍝'
            case 'traditions':
                return '🎭'
            case 'stories':
                return '📖'
            case 'questions':
                return '❓'
            default:
                return '💬'
        }
    }

    const formatDate = (date: Date | null) => {
        if (!date) return ''
        const now = new Date()
        const threadDate = new Date(date)
        const diffMs = now.getTime() - threadDate.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        
        return threadDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
    }

    const content = (
        <div className="group bg-gradient-to-br from-white/[0.05] to-white/[0.02] border rounded-lg p-3 border-amber-500/40 hover:bg-white/[0.08] transition-all duration-200 cursor-pointer">
            <div className="flex items-start gap-2.5">
                {/* Category icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                    {getCategoryIcon(thread.category)}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <h3 className="text-sm font-semibold text-amber-400 transition-colors line-clamp-1 mb-1">
                        {thread.title}
                    </h3>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getScopeBadgeStyle(thread.scope)}`}
                        >
                            {thread.scope === 'country' ? '🌍 Country' : '📍 State'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-white/10 text-gray-300 rounded text-[10px] font-medium">
                            {thread.category}
                        </span>
                    </div>

                    {/* Content preview */}
                    <p className="text-gray-400 text-xs line-clamp-1 mb-2">
                        {thread.content}
                    </p>

                    {/* Footer stats */}
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{thread.view_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>Reply</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(thread.created_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Arrow indicator */}
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-amber-400" />
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
                // rel={isProfilePage ? "noopener noreferrer" : undefined}
>
            {content}
        </Link>
    )
}
