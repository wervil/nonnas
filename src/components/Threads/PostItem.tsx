'use client'

import { useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Post } from '@/db/schema'
import LikeButton from '../LikeButton'
import Link from 'next/link'
import { Reply, Trash2, Edit2, Loader2, Check, X, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import CommentEditor, { Attachment } from '../Comments/CommentEditor'
import AudioPlayer from '../ui/AudioPlayer'

interface PostItemProps {
    post: Post & { replies?: PostItemProps['post'][] }
    threadId: number
    currentUserId?: string
    isAuthenticated: boolean
    onReply?: (postId: number) => void
    onDelete?: (postId: number) => void
    onEdit?: (postId: number, content: string) => void
    onReplySubmit?: (parentPostId: number, content: string, attachments?: Attachment[]) => Promise<Post>
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
    const [editContent, setEditContent] = useState<string>(String(post.content || ''))
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Inline reply form state
    const [showReplyForm, setShowReplyForm] = useState(false)
    const [localReplies, setLocalReplies] = useState<Post[]>(post.replies || [])

    // Local display state for immediate updates
    const [displayContent, setDisplayContent] = useState<string>(String(post.content || ''))
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Sync local replies when prop changes (e.g. after deletion in parent)
    useEffect(() => {
        setLocalReplies(post.replies || [])
    }, [post.replies])

    // Sync display content when prop changes
    useEffect(() => {
        setDisplayContent(String(post.content || ''))
    }, [post.content])

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
            setDisplayContent(editContent)
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

    const handleInlineReply = async (content: string, attachments?: Attachment[]) => {
        if ((!content.trim() && (!attachments || attachments.length === 0)) || !onReplySubmit) return

        // setIsReplySubmitting(true) // Handled by CommentEditor loading state mostly
        try {
            const newPost = await onReplySubmit(post.id, content, attachments)
            // Optimistically add the new reply to local state
            setLocalReplies([...localReplies, newPost])
            setShowReplyForm(false)
        } catch (error) {
            if (error instanceof Error && error.message === 'MODERATION_ERROR') {
                // Already handled by parent with toast
                return
            }
            console.error('Error posting reply:', error)
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

    const handleChildDelete = (childId: number) => {
        setLocalReplies(prev => prev.filter(r => r.id !== childId))
    }

    const handleChildEdit = (childId: number, content: string) => {
        setLocalReplies(prev => prev.map(r => r.id === childId ? { ...r, content } : r))
        if (onEdit) onEdit(childId, content)
    }

    const contentSection: any = isEditing ? (
        <div className="space-y-2">
            <textarea
                value={editContent || ''}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={5000}
                rows={3}
                aria-label="Edit post content"
                placeholder="Edit your post..."
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none font-[var(--font-bell)]"
            />
        </div>
    ) : (
        <p className="text-gray-700 text-sm mb-2 whitespace-pre-wrap leading-relaxed font-[var(--font-bell)]">{String(displayContent || '')}</p>
    )

    return (
        <>
            <div
                className="pl-3 py-1"
                style={{ marginLeft: `${(post.depth || 0) * 12}px` }}
            >
                <div className={`rounded-lg p-3 transition-colors ${(post.depth || 0) > 0
                    ? 'bg-transparent border-transparent pl-0'
                    : 'bg-white border border-gray-200 shadow-sm'
                    } hover:border-amber-500/30`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs">
                            {/* Avatar with Initials */}
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-green-dark)] to-[var(--color-success-main)] flex items-center justify-center text-[var(--color-yellow-light)] font-bold text-[10px] uppercase">
                                {(post.author_name || post.user_id || '??').slice(0, 2)}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-xs font-[var(--font-bell)]">
                                    {post.author_name || (post.user_id ? `${post.user_id.slice(0, 8)}...` : 'Unknown')}
                                </span>
                                <span className="text-gray-400 font-[var(--font-bell)]">
                                    • {formatDate(post.created_at)}
                                    {post.updated_at && post.updated_at !== post.created_at && (
                                        <span className="text-gray-400/70 ml-1">(edited)</span>
                                    )}
                                </span>
                                {currentUserId && currentUserId !== post.user_id && (
                                    <Link
                                        href={`/messages?chatWith=${post.user_id}&name=${encodeURIComponent(post.author_name || '')}`}
                                        target="_blank"
                                        className="ml-2 text-gray-400 hover:text-amber-600 transition-colors"
                                        title="Message User"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                {isOwner && (
                                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-[var(--font-bell)] ml-2">
                                        You
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        {isOwner && !isEditing ? (
                            <div className="flex items-center gap-0.5">
                                {!((post.attachments || []) as Attachment[]).some((a) => a.type === 'audio') && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                                        title="Edit"
                                        type="button"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {showDeleteConfirm ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200 bg-[var(--color-brown-light)]/20 rounded-md px-2 py-1 ml-1">
                                        <span className="text-xs text-[var(--color-danger-main)] font-[var(--font-bell)] whitespace-nowrap">Delete?</span>
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="px-2 py-0.5 text-xs bg-[var(--color-danger-main)] text-white rounded hover:bg-[var(--color-danger-hover)] transition-colors font-[var(--font-bell)] flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            type="button"
                                        >
                                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-2 py-0.5 text-xs text-[var(--color-text-pale)] hover:bg-[var(--color-brown-light)]/50 rounded transition-colors font-[var(--font-bell)]"
                                            type="button"
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                        title="Delete"
                                        type="button"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>
                    {contentSection}

                    {/* Attachments - Always visible */}
                    {post.attachments && (post.attachments as any[]).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 mt-2">
                            {(post.attachments as any[]).map((att, i) => (
                                <div key={i} className={att.type === 'video' || att.type === 'image' ? "max-w-xs" : "w-full"}>
                                    {att.type === 'image' ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={att.url}
                                            alt="Attachment"
                                            className="max-h-48 rounded-lg border border-gray-200 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => setSelectedImage(att.url)}
                                        />
                                    ) : att.type === 'video' ? (
                                        <video src={att.url} controls className="max-h-48 rounded-lg border border-gray-200" />
                                    ) : (
                                        <AudioPlayer src={att.url} className="w-full" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Edit Actions OR Footer */}
                    {isEditing ? (
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleEdit}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded text-xs font-medium font-[var(--font-bell)] flex items-center gap-1.5 transition-all disabled:opacity-50"
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
                                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded text-xs font-medium font-[var(--font-bell)] flex items-center gap-1.5 transition-all hover:bg-gray-200 border border-transparent"
                            >
                                <X className="w-3 h-3" />
                                Cancel
                            </button>
                        </div>
                    ) : (
                        // Normal view footer
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <LikeButton
                                likeableId={post.id}
                                likeableType="post"
                                isAuthenticated={isAuthenticated}
                            />
                            {canReply && (
                                <button
                                    onClick={() => setShowReplyForm(!showReplyForm)}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-all text-xs font-medium font-[var(--font-bell)] border border-gray-200"
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
                    <div className="mt-3 ml-3">
                        <CommentEditor
                            onSubmit={handleInlineReply}
                            onCancel={() => setShowReplyForm(false)}
                            placeholder={isAuthenticated ? "Write your reply..." : "Sign in to reply"}
                            isReply={true}
                        />
                    </div>
                )}

                {/* Nested Replies */}
                {localReplies && localReplies.length > 0 && (
                    <div className="mt-2 border-l-2 border-gray-200 pl-2">
                        {localReplies.map((reply) => (
                            <PostItem
                                key={reply.id}
                                post={reply}
                                threadId={threadId}
                                currentUserId={currentUserId}
                                isAuthenticated={isAuthenticated}
                                onReply={onReply}
                                onDelete={handleChildDelete}
                                onEdit={handleChildEdit}
                                onReplySubmit={onReplySubmit}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Full Image Modal */}
            {
                selectedImage && mounted && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onClick={() => setSelectedImage(null)}
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="fixed top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-[110]"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={selectedImage}
                                alt="Full size"
                                className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            />
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    )
}
