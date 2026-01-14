'use client'

import { useEffect, useState } from 'react'
import ThreadCard from './ThreadCard'
import { Thread } from '@/db/schema'

interface ThreadListProps {
    region?: string
    scope?: 'country' | 'state'
    category?: string
    sort?: 'newest' | 'top' | 'relevant'
    onThreadClick?: (threadId: number) => void
}

export default function ThreadList({
    region,
    scope,
    category,
    sort = 'newest',
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
                if (category) params.append('category', category)
                if (sort) params.append('sort', sort)

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
    }, [region, scope, category, sort])

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">{error}</p>
            </div>
        )
    }

    if (threads.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No discussions yet. Be the first to start one!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} onClick={onThreadClick} />
            ))}
        </div>
    )
}
