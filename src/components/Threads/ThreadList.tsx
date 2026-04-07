'use client'

import { Thread } from '@/db/schema'
import { Loader2, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import ThreadCard from './ThreadCard'

interface ThreadListProps {
    region?: string
    scope?: 'continent' | 'country' | 'state' | 'city'
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
            <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-3" />
                <p className="text-gray-500 text-sm">Loading discussions...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-gray-500 text-sm mt-2">Please try again later</p>
            </div>
        )
    }

    if (threads.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Discussions Yet</h3>
                <p className="text-gray-500 text-sm">
                    Be the first to start a conversation in this region!
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3 w-full">
            {threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} onClick={onThreadClick} />
            ))}
        </div>
    )
}