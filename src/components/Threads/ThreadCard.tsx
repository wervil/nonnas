'use client'

import Link from 'next/link'
import { Thread } from '@/db/schema'
import { MessageSquare, Eye } from 'lucide-react'

interface ThreadCardProps {
    thread: Thread
    onClick?: (threadId: number) => void
}

export default function ThreadCard({ thread, onClick }: ThreadCardProps) {
    const getScopeBadgeColor = (scope: string) => {
        return scope === 'country'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-green-100 text-green-700'
    }

    const formatDate = (date: Date | null) => {
        if (!date) return ''
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const content = (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                        {thread.title}
                    </h3>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                        <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getScopeBadgeColor(
                                thread.scope
                            )}`}
                        >
                            {thread.scope === 'country' ? 'Country' : 'State'}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                            {thread.category}
                        </span>
                        <span className="text-gray-500">{thread.region}</span>
                    </div>

                    {/* Content preview */}
                    <p className="text-gray-700 line-clamp-2 mb-3">{thread.content}</p>

                    {/* Footer */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{thread.view_count || 0} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>Reply</span>
                        </div>
                        <span>•</span>
                        <span>{formatDate(thread.created_at)}</span>
                    </div>
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
        <Link href={`/community/thread/${thread.id}`}>
            {content}
        </Link>
    )
}
