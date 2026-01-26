'use client'

import { useState, useEffect } from 'react'
import { Post } from '@/db/schema'
import LikeButton from '../LikeButton'
import Link from 'next/link'
import { Reply, Trash2, Edit2, Loader2, Check, X, Send, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../ui/Button'

interface PostItemProps {
    post: Post & { replies?: PostItemProps['post'][] }
    threadId: number
    currentUserId?: string
    isAuthenticated: boolean
    onReply?: (postId: number) => void
    onDelete?: (postId: number) => void
    onEdit?: (postId: number, content: string) => void
    onReplySubmit?: (parentPostId: number, content: string) => Promise<Post>
}

export default function PostItem({
    post,
    threadId,
    currentUserId,
    isAuthenticated,
    onReply,
    onDelete,
    onEdit,
    onReplySubmit,
}: PostItemProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(post.content)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Inline reply form state
    const [showReplyForm, setShowReplyForm] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [isReplySubmitting, setIsReplySubmitting] = useState(false)
    const [localReplies, setLocalReplies] = useState<Post[]>(post.replies || [])

    // Sync local replies when prop changes (e.g. after deletion in parent)
    useEffect(() => {
        setLocalReplies(post.replies || [])
    }, [post.replies])

    const isOwner = currentUserId === post.user_id
    const canReply = (post.depth || 0) < 5

    const handleEdit = async () => {
        if (!editContent.trim()) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: editContent }),
            })

            if (!response.ok) {
                const data = await response.json()
                if (response.status === 400) {
                    toast.error(data.error || 'Failed to update post')
                    setIsSubmitting(false)
                    return
                }
                throw new Error('Failed to update post')
            }

            if (onEdit) {
                onEdit(post.id, editContent)
            }
            setIsEditing(false)
        } catch (error) {
            console.error('Error updating post:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/posts/${post.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete post')

            if (onDelete) {
                onDelete(post.id)
            }
        } catch (error) {
            console.error('Error deleting post:', error)
            setIsDeleting(false)
        }
    }

    const handleInlineReply = async () => {
        if (!replyContent.trim() || !onReplySubmit) return

        setIsReplySubmitting(true)
        try {
            const newPost = await onReplySubmit(post.id, replyContent)
            // Optimistically add the new reply to local state
            setLocalReplies([...localReplies, newPost])
            setReplyContent('')
            setShowReplyForm(false)
        } catch (error) {
            if (error instanceof Error && error.message === 'MODERATION_ERROR') {
                // Already handled by parent with toast
                return
            }
            console.error('Error posting reply:', error)
        } finally {
            setIsReplySubmitting(false)
        }
    }

    const formatDate = (date: Date | null) => {
        if (!date) return ''
        const now = new Date()
        const postDate = new Date(date)
        const diffMs = now.getTime() - postDate.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`

        return postDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })
    }

    return (
        <div
            className="pl-3 py-1"
            style={{ marginLeft: `${(post.depth || 0) * 12}px` }}
        >
            <div className="bg-gradient-to-br from-[var(--color-brown-pale)]/60 via-[var(--color-brown-pale)]/40 to-[var(--color-brown-light)]/30 rounded-lg p-3 border border-[var(--color-primary-border)]/20 hover:border-[var(--color-primary-border)]/40 transition-colors shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs">
                        {/* Avatar with Initials */}
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-green-dark)] to-[var(--color-success-main)] flex items-center justify-center text-[var(--color-yellow-light)] font-bold text-[10px] uppercase">
                            {(post.author_name || post.user_id || '??').slice(0, 2)}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--color-yellow-light)] text-xs font-[var(--font-bell)]">
                                {post.author_name || (post.user_id ? `${post.user_id.slice(0, 8)}...` : 'Unknown')}
                            </span>
                            <span className="text-[var(--color-text-pale)] font-[var(--font-bell)]">
                                • {formatDate(post.created_at)}
                                {post.updated_at && post.updated_at !== post.created_at && (
                                    <span className="text-[var(--color-text-pale)]/70 ml-1">(edited)</span>
                                )}
                            </span>
                            {currentUserId && currentUserId !== post.user_id && (
                                <Link
                                    href={`/messages?chatWith=${post.user_id}`}
                                    target="_blank"
                                    className="ml-2 text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] transition-colors"
                                    title="Message User"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </Link>
                            )}
                            {isOwner && (
                                <span className="px-2 py-0.5 text-xs bg-[var(--color-primary-focus)] text-[var(--color-primary-main)] rounded-full font-[var(--font-bell)] ml-2">
                                    You
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {isOwner && !isEditing && (
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] hover:bg-[var(--color-brown-light)]/50 rounded transition-all"
                                title="Edit"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {showDeleteConfirm ? (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200 bg-[var(--color-brown-light)]/20 rounded-md px-2 py-1 ml-1">
                                    <span className="text-xs text-[var(--color-danger-main)] font-[var(--font-bell)] whitespace-nowrap">Delete?</span>
                                    <button
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="px-2 py-0.5 text-xs bg-[var(--color-danger-main)] text-white rounded hover:bg-[var(--color-danger-hover)] transition-colors font-[var(--font-bell)] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-2 py-0.5 text-xs text-[var(--color-text-pale)] hover:bg-[var(--color-brown-light)]/50 rounded transition-colors font-[var(--font-bell)]"
                                    >
                                        No
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-1.5 text-[var(--color-text-pale)] hover:text-[var(--color-danger-main)] hover:bg-[var(--color-brown-light)]/50 rounded transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            maxLength={5000}
                            rows={3}
                            aria-label="Edit post content"
                            placeholder="Edit your post..."
                            className="w-full px-3 py-2 bg-[var(--color-brown-light)]/50 border border-[var(--color-primary-border)]/30 rounded-lg text-[var(--color-text-pale)] text-sm placeholder-[var(--color-text-pale)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-dark)]/50 focus:border-[var(--color-green-dark)]/50 transition-all resize-none font-[var(--font-bell)]"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleEdit}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-gradient-to-r from-[var(--color-green-dark)] via-[var(--color-success-main)] to-[var(--color-green-dark)] text-[var(--color-yellow-light)] rounded text-xs font-medium font-[var(--font-bell)] flex items-center gap-1.5 transition-all hover:opacity-90 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Check className="w-3 h-3" />
                                )}
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false)
                                    setEditContent(post.content)
                                }}
                                className="px-3 py-1.5 bg-[var(--color-brown-light)]/50 text-[var(--color-text-pale)] rounded text-xs font-medium font-[var(--font-bell)] flex items-center gap-1.5 transition-all hover:bg-[var(--color-brown-light)]/70 border border-[var(--color-primary-border)]/30"
                            >
                                <X className="w-3 h-3" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-[var(--color-text-pale)] text-sm mb-2 whitespace-pre-wrap leading-relaxed font-[var(--font-bell)]">{post.content}</p>
                )}

                {/* Footer */}
                {!isEditing && (
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-primary-border)]/10">
                        <LikeButton
                            likeableId={post.id}
                            likeableType="post"
                            isAuthenticated={isAuthenticated}
                        />
                        {canReply && (
                            <button
                                onClick={() => setShowReplyForm(!showReplyForm)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--color-brown-light)]/30 text-[var(--color-text-pale)] hover:bg-[var(--color-brown-light)]/50 hover:text-[var(--color-yellow-light)] transition-all text-xs font-medium font-[var(--font-bell)] border border-[var(--color-primary-border)]/20"
                            >
                                <Reply className="w-3 h-3" />
                                <span>{showReplyForm ? 'Cancel' : 'Reply'}</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Inline Reply Form */}
            {showReplyForm && (
                <div className="mt-3 ml-3 bg-gradient-to-br from-[var(--color-brown-pale)]/50 via-[var(--color-brown-pale)]/30 to-[var(--color-brown-light)]/20 border border-[var(--color-primary-border)]/20 rounded-lg p-3 shadow-sm">
                    <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        maxLength={5000}
                        rows={3}
                        placeholder={isAuthenticated ? 'Write your reply...' : 'Sign in to reply'}
                        disabled={!isAuthenticated}
                        className="w-full px-3 py-2 bg-[var(--color-brown-light)]/50 border border-[var(--color-primary-border)]/30 rounded-lg text-[var(--color-text-pale)] text-sm placeholder-[var(--color-text-pale)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-dark)]/50 focus:border-[var(--color-green-dark)]/50 transition-all resize-none mb-2 disabled:opacity-50 disabled:cursor-not-allowed font-[var(--font-bell)]"
                    />
                    <div className="flex justify-between items-center">
                        <span className={`text-xs font-[var(--font-bell)] ${replyContent.length > 4500 ? 'text-[var(--color-yellow-light)]' : 'text-[var(--color-text-pale)]'}`}>
                            {replyContent.length}/5000
                        </span>
                        <Button
                            variant="primary"
                            size={"shrink"}
                            className='gap-2 text-sm w-fit disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1.5'
                            onClick={handleInlineReply}
                            disabled={!isAuthenticated || !replyContent.trim() || isReplySubmitting}

                        >
                            {isReplySubmitting ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-3 h-3" />
                                    Post Reply
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Nested Replies */}
            {localReplies && localReplies.length > 0 && (
                <div className="mt-2 border-l-2 border-[var(--color-green-dark)]/30">
                    {localReplies.map((reply) => (
                        <PostItem
                            key={reply.id}
                            post={reply}
                            threadId={threadId}
                            currentUserId={currentUserId}
                            isAuthenticated={isAuthenticated}
                            onReply={onReply}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onReplySubmit={onReplySubmit}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
