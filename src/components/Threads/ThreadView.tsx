'use client'

import { useEffect, useState } from 'react'
import { Thread, Post } from '@/db/schema'
import PostItem from './PostItem'
import LikeButton from '../LikeButton'
import { ArrowLeft, MessageSquare, Eye, Calendar, User, Loader2, Send } from 'lucide-react'
import Link from 'next/link'

interface ThreadViewProps {
    threadId: number
    currentUserId?: string
    isAuthenticated: boolean
    onBack?: () => void
    hideBackButton?: boolean
}

// Extended thread type with like and post data
interface EnrichedThread extends Thread {
    like_count: number
    user_has_liked: boolean
    posts: Post[]
}

export default function ThreadView({
    threadId,
    currentUserId,
    isAuthenticated,
    onBack,
    hideBackButton,
}: ThreadViewProps) {
    const [thread, setThread] = useState<EnrichedThread | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    // Add a key that changes each time to force refetch
    const [fetchKey, setFetchKey] = useState(Date.now())

    useEffect(() => {
        const fetchThread = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const response = await fetch(`/api/threads/${threadId}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch thread')
                }

                const data: EnrichedThread = await response.json()
                setThread(data)
                // Set posts from the API response
                setPosts(data.posts || [])
            } catch (err) {
                console.error('Error fetching thread:', err)
                setError('Failed to load thread')
            } finally {
                setIsLoading(false)
            }
        }

        fetchThread()
    }, [threadId, fetchKey]) // Include fetchKey to refetch when it changes

    useEffect(() => {
        // Force refetch when component mounts (e.g., when reopening the same thread)
        setFetchKey(Date.now())
    }, [])

    const handleReply = async () => {
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
                    parent_post_id: null, // Top-level reply only
                    content: replyContent,
                }),
            })

            if (!response.ok) throw new Error('Failed to create reply')

            const newPost = await response.json()
            // Optimistically add to posts
            setPosts([...posts, newPost])
            setReplyContent('')
        } catch (error) {
            console.error('Error creating reply:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePostEdit = () => {
        // Refetch thread data to show updated post content
        setFetchKey(Date.now())
    }

    const handlePostDelete = () => {
        // Refetch thread data to remove deleted post
        setFetchKey(Date.now())
    }

    // Handle inline reply submission (for nested replies)
    const handleReplySubmit = async (parentPostId: number, content: string): Promise<Post> => {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                thread_id: threadId,
                parent_post_id: parentPostId,
                content: content,
            }),
        })

        if (!response.ok) throw new Error('Failed to create reply')

        const newPost = await response.json()
        return newPost
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
            <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
                <p className="text-gray-500 text-sm">Loading discussion...</p>
            </div>
        )
    }

    if (error || !thread) {
        return (
            <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-red-400 font-medium">{error || 'Thread not found'}</p>
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
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 mb-6 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to discussions</span>
                    </button>
                ) : (
                    <Link
                        href="/community"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 mb-6 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back to discussions</span>
                    </Link>
                )
            )}

            {/* Thread Header */}
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 rounded-xl p-5 mb-4">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${thread.scope === 'country'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                    >
                        {thread.scope === 'country' ? '🌍 Country' : '📍 State'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/10 text-gray-300 rounded-full text-xs font-medium">
                        {thread.category}
                    </span>
                    <span className="text-gray-500 text-xs">{thread.region}</span>
                </div>

                {/* Title - smaller and more compact */}
                <h2 className="text-lg font-bold  mb-2" style={{ color: 'white' }}>{thread.title}</h2>

                {/* Content */}
                <p className="text-gray-300 text-sm whitespace-pre-wrap mb-4 leading-relaxed">{thread.content}</p>

                {/* Meta info - more compact */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3 pb-3 border-b border-white/10">
                    <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-gray-400 truncate max-w-[100px]">{thread.user_id?.slice(0, 8)}...</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(thread.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>{thread.view_count || 0} views</span>
                    </span>
                </div>

                <LikeButton
                    likeableId={thread.id}
                    likeableType="thread"
                    isAuthenticated={isAuthenticated}
                    initialLiked={thread.user_has_liked}
                    initialCount={thread.like_count}
                />
            </div>

            {/* Reply Form */}
            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-xl p-4 mb-4">
                <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    Reply to this discussion
                </h2>
                <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    maxLength={5000}
                    rows={3}
                    placeholder={
                        isAuthenticated
                            ? 'Share your thoughts...'
                            : 'Sign in to join the discussion'
                    }
                    disabled={!isAuthenticated}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex justify-between items-center">
                    <span className={`text-xs ${replyContent.length > 4500 ? 'text-amber-400' : 'text-gray-500'}`}>
                        {replyContent.length}/5000
                    </span>
                    <button
                        onClick={() => handleReply()}
                        disabled={!isAuthenticated || !replyContent.trim() || isSubmitting}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm rounded-lg hover:from-amber-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:shadow-none flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Posting...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Post Reply
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Posts */}
            <div className="space-y-3">
                {posts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-amber-500/50" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">No replies yet</p>
                        <p className="text-gray-500 text-xs mt-1">Be the first to reply!</p>
                    </div>
                ) : (
                    posts.map((post) => (
                        <PostItem
                            key={post.id}
                            post={post}
                            threadId={threadId}
                            currentUserId={currentUserId}
                            isAuthenticated={isAuthenticated}
                            onEdit={handlePostEdit}
                            onDelete={handlePostDelete}
                            onReplySubmit={handleReplySubmit}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
