'use client'

import { useEffect, useState } from 'react'
import { Thread, Post } from '@/db/schema'
import PostItem from './PostItem'
import LikeButton from '../LikeButton'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface ThreadViewProps {
    threadId: number
    currentUserId?: string
    isAuthenticated: boolean
    onBack?: () => void
    hideBackButton?: boolean
}

export default function ThreadView({
    threadId,
    currentUserId,
    isAuthenticated,
    onBack,
    hideBackButton,
}: ThreadViewProps) {
    const [thread, setThread] = useState<Thread | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [replyToPostId, setReplyToPostId] = useState<number | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        const fetchThread = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const response = await fetch(`/api/threads/${threadId}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch thread')
                }

                const data = await response.json()
                setThread(data)
            } catch (err) {
                console.error('Error fetching thread:', err)
                setError('Failed to load thread')
            } finally {
                setIsLoading(false)
            }
        }

        fetchThread()
    }, [threadId])

    const handleReply = async (parentPostId?: number) => {
        if (!replyContent.trim()) return

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    thread_id: threadId,
                    parent_post_id: parentPostId || null,
                    content: replyContent,
                }),
            })

            if (!response.ok) throw new Error('Failed to create reply')

            const newPost = await response.json()
            setPosts([...posts, newPost])
            setReplyContent('')
            setReplyToPostId(null)
        } catch (error) {
            console.error('Error creating reply:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatDate = (date: Date | null) => {
        if (!date) return ''
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (error || !thread) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">{error || 'Thread not found'}</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            {!hideBackButton && (
                onBack ? (
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to discussions</span>
                    </button>
                ) : (
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to discussions</span>
                    </Link>
                )
            )}

            {/* Thread Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${thread.scope === 'country'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                            }`}
                    >
                        {thread.scope === 'country' ? 'Country' : 'State'}
                    </span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
                        {thread.category}
                    </span>
                    <span className="text-gray-600">{thread.region}</span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">{thread.title}</h1>

                <p className="text-gray-800 whitespace-pre-wrap mb-4">{thread.content}</p>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span>By {thread.user_id}</span>
                    <span>•</span>
                    <span>{formatDate(thread.created_at)}</span>
                    <span>•</span>
                    <span>{thread.view_count || 0} views</span>
                </div>

                <LikeButton
                    likeableId={thread.id}
                    likeableType="thread"
                    isAuthenticated={isAuthenticated}
                />
            </div>

            {/* Reply Form */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Reply to this discussion
                </h2>
                <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    maxLength={5000}
                    rows={4}
                    placeholder={
                        isAuthenticated
                            ? 'Share your thoughts...'
                            : 'Sign in to join the discussion'
                    }
                    disabled={!isAuthenticated}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                />
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{replyContent.length}/5000</span>
                    <button
                        onClick={() => handleReply()}
                        disabled={!isAuthenticated || !replyContent.trim() || isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSubmitting ? 'Posting...' : 'Post Reply'}
                    </button>
                </div>
            </div>

            {/* Posts */}
            <div className="space-y-4">
                {posts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No replies yet. Be the first to reply!
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostItem
                            key={post.id}
                            post={post}
                            threadId={threadId}
                            currentUserId={currentUserId}
                            isAuthenticated={isAuthenticated}
                            onReply={setReplyToPostId}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
