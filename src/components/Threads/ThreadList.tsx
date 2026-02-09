'use client'

import { useEffect, useState } from 'react'
import ThreadCard from './ThreadCard'
import { Thread } from '@/db/schema'
import { MessageCircle, Loader2 } from 'lucide-react'

interface ThreadListProps {
    region?: string
    scope?: 'country' | 'state'

    sort?: 'newest' | 'top' | 'relevant'
    userId?: string
    onThreadClick?: (threadId: number) => void
}

export default function ThreadList({
    region,
    scope,

    sort = 'newest',
    userId,
    onThreadClick,
}: ThreadListProps) {
    const [threads, setThreads] = useState<Thread[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchThreads = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams()
                if (region) params.append('region', region)
                if (scope) params.append('scope', scope)

                if (sort) params.append('sort', sort)
                if (userId) params.append('userId', userId)

                const response = await fetch(`/api/threads?${params.toString()}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch threads')
                }

                const data = await response.json()
                setThreads(data)
            } catch (err) {
                console.error('Error fetching threads:', err)
                setError('Failed to load threads')
            } finally {
                setIsLoading(false)
            }
        }

        fetchThreads()
    }, [region, scope, sort, userId])

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
                <p className="text-gray-500 text-sm">Loading discussions...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-red-400 font-medium">{error}</p>
                <p className="text-gray-500 text-sm mt-2">Please try again later</p>
            </div>
        )
    }

    if (threads.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                    <MessageCircle className="w-10 h-10 text-amber-500/50" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Discussions Yet</h3>
                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    Be the first to start a conversation in this region!
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3 w-full">
            {threads.map((thread, index) => (
                <div
                    key={thread.id}
                    className="animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                >
                    <ThreadCard thread={thread} onClick={onThreadClick} />
                </div>
            ))}
        </div>
    )
}
