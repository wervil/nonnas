'use client'

import { useEffect, useState } from 'react'
import { Thread, Post } from '@/db/schema'
import PostItem from './PostItem'
import LikeButton from '../LikeButton'
import { MessageSquare, Eye, Calendar, Loader2, Send } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Button from '../ui/Button'

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

type PostWithReplies = Post & { replies: PostWithReplies[] }

export default function ThreadView({
    threadId,
    currentUserId,
    isAuthenticated,
    // onBack,
    // hideBackButton,
}: ThreadViewProps) {
    const [thread, setThread] = useState<EnrichedThread | null>(null)
    const [posts, setPosts] = useState<PostWithReplies[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [replyContent, setReplyContent] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    // Add a key that changes each time to force refetch
    const [fetchKey, setFetchKey] = useState(Date.now())

    // Build tree structure from flat posts array
    const buildPostTree = (flatPosts: Post[]): PostWithReplies[] => {
        const postMap = new Map<number, PostWithReplies>()
        const rootPosts: PostWithReplies[] = []

        // First pass: create map of all posts with empty replies array
        flatPosts.forEach(post => {
            postMap.set(post.id, { ...post, replies: [] } as PostWithReplies)
        })

        // Second pass: build tree structure
        flatPosts.forEach(post => {
            const postWithReplies = postMap.get(post.id)!
            if (post.parent_post_id) {
                // This is a nested reply, add it to parent's replies
                const parent = postMap.get(post.parent_post_id)
                if (parent) {
                    parent.replies.push(postWithReplies)
                } else {
                    // Parent not found, treat as root
                    rootPosts.push(postWithReplies)
                }
            } else {
                // This is a top-level post
                rootPosts.push(postWithReplies)
            }
        })

        return rootPosts
    }

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
                // Build tree structure from flat posts array
                const treePosts = buildPostTree(data.posts || [])
                setPosts(treePosts)
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

            if (!response.ok) {
                const data = await response.json()
                if (response.status === 400) {
                    toast.error(data.error || 'Failed to post reply')
                    return
                }
                throw new Error('Failed to create reply')
            }

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

    const handlePostDelete = (postId: number) => {
        // Optimistically remove from state instead of refetching
        setPosts((currentPosts) => {
            // Helper function to recursively remove post
            const removePost = (posts: PostWithReplies[]): PostWithReplies[] => {
                return posts.filter(p => {
                    if (p.id === postId) return false
                    if (p.replies) {
                        p.replies = removePost(p.replies)
                    }
                    return true
                })
            }
            return removePost(currentPosts)
        })
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

        if (!response.ok) {
            const data = await response.json()
            if (response.status === 400) {
                toast.error(data.error || 'Failed to post reply')
                throw new Error('MODERATION_ERROR') // specific error to catch/ignore
            }
            throw new Error('Failed to create reply')
        }

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
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-green-dark)]/20 to-[var(--color-success-main)]/20 flex items-center justify-center mb-4">
                    <Loader2 className="w-6 h-6 text-[var(--color-yellow-light)] animate-spin" />
                </div>
                <p className="text-[var(--color-text-pale)] text-sm font-[var(--font-bell)]">Loading discussion...</p>
            </div>
        )
    }

    if (error || !thread) {
        return (
            <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-danger-main)]/10 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-[var(--color-danger-main)] font-medium font-[var(--font-bell)]">{error || 'Thread not found'}</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            {/* {!hideBackButton && (
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
            )} */}

            {/* Thread Header */}
            <div className="bg-gradient-to-br from-[var(--color-brown-pale)]/80 via-[var(--color-brown-pale)]/60 to-[var(--color-brown-light)]/40 border border-[var(--color-primary-border)]/20 rounded-xl p-5 mb-4 shadow-lg">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-lg bg-[var(--color-brown-light)]/50">
                    <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium font-[var(--font-bell)] border ${thread.scope === 'country'
                            ? 'bg-[var(--color-info-main)]/30 text-[var(--color-info-main)] border-[var(--color-info-main)]/50'
                            : 'bg-[var(--color-success-main)]/30 text-[var(--color-success-main)] border-[var(--color-success-main)]/50'
                            }`}
                    >
                        {thread.scope === 'country' ? '🌍 Country' : '📍 State'}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[var(--color-primary-border)]/30 text-[var(--color-yellow-light)] rounded-full text-xs font-medium font-[var(--font-bell)] border border-[var(--color-primary-border)]/50">
                        {thread.category}
                    </span>
                    <span className="text-[var(--color-text-pale)] text-xs font-[var(--font-bell)]">{thread.region}</span>
                </div>

                {/* Title - smaller and more compact */}
                <h2 className="text-lg font-bold mb-2 text-[var(--color-yellow-light)] capitalize font-[var(--font-bell)]">{thread.title}</h2>

                {/* Content */}
                <p className="text-[var(--color-text-pale)] text-sm whitespace-pre-wrap mb-4 leading-relaxed font-[var(--font-bell)]">{thread.content}</p>

                {/* Meta info - more compact */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-pale)] mb-3 pb-3 border-b border-[var(--color-primary-border)]/20">
                    {/* Avatar and Name */}
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--color-green-dark)] to-[var(--color-success-main)] flex items-center justify-center text-[var(--color-yellow-light)] font-bold text-[9px] uppercase">
                            {(thread.author_name || thread.user_id || '??').slice(0, 2)}
                        </div>
                        <span className="text-[var(--color-text-pale)] truncate max-w-[150px] font-medium font-[var(--font-bell)]">
                            {thread.author_name || (thread.user_id ? `${thread.user_id.slice(0, 8)}...` : 'Unknown')}
                        </span>

                        {/* Message Icon after 1 hour */}
                        {isAuthenticated && (!thread.created_at || (Date.now() - new Date(thread.created_at).getTime() > 3600000)) && currentUserId !== thread.user_id && (
                            <Link
                                href={`/messages?chatWith=${thread.user_id}`}
                                target="_blank"
                                className="text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] transition-colors ml-1"
                                title="Message User"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                            </Link>
                        )}
                    </div>

                    <span className="flex items-center gap-1 font-[var(--font-bell)]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(thread.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-1 font-[var(--font-bell)]">
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
            <div className="bg-gradient-to-br from-[var(--color-brown-pale)]/60 via-[var(--color-brown-pale)]/40 to-[var(--color-brown-light)]/30 border border-[var(--color-primary-border)]/20 rounded-xl p-4 mb-4 shadow-lg">
                <h2 className="text-sm font-semibold text-[var(--color-yellow-light)] mb-3 flex items-center gap-2 font-[var(--font-bell)]">
                    <MessageSquare className="w-4 h-4 text-[var(--color-yellow-light)]" />
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
                    className="w-full px-3 py-2.5 bg-[var(--color-brown-light)]/50 border border-[var(--color-primary-border)]/30 rounded-lg text-[var(--color-text-pale)] text-sm placeholder-[var(--color-text-pale)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-dark)]/50 focus:border-[var(--color-green-dark)]/50 transition-all resize-none mb-3 disabled:opacity-50 disabled:cursor-not-allowed font-[var(--font-bell)]"
                />
                <div className="flex justify-between items-center">
                    <span className={`text-xs font-[var(--font-bell)] ${replyContent.length > 4500 ? 'text-[var(--color-yellow-light)]' : 'text-[var(--color-text-pale)]'}`}>
                        {replyContent.length}/5000
                    </span>
                    <Button
                        variant="primary"
                        size={"shrink"}
                        className='gap-2 text-sm w-fit disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1.5'
                        onClick={() => handleReply()}
                        disabled={!isAuthenticated || !replyContent.trim() || isSubmitting}
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
                    </Button>
                </div>
            </div>

            {/* Posts */}
            <div className="space-y-3">
                {posts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-[var(--color-green-dark)]/20 to-[var(--color-success-main)]/20 flex items-center justify-center">
                            <MessageSquare className="w-6 h-6 text-[var(--color-yellow-light)]/50" />
                        </div>
                        <p className="text-[var(--color-text-pale)] text-sm font-medium font-[var(--font-bell)]">No replies yet</p>
                        <p className="text-[var(--color-text-pale)]/70 text-xs mt-1 font-[var(--font-bell)]">Be the first to reply!</p>
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
