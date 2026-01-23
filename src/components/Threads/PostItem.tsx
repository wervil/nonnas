'use client'

import { useState } from 'react'
import { Post } from '@/db/schema'
import LikeButton from '../LikeButton'
import Link from 'next/link'
import { Reply, Trash2, Edit2, Loader2, Check, X, Send, MessageSquare } from 'lucide-react'

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

    // Inline reply form state
    const [showReplyForm, setShowReplyForm] = useState(false)
    const [replyContent, setReplyContent] = useState('')
    const [isReplySubmitting, setIsReplySubmitting] = useState(false)
    const [localReplies, setLocalReplies] = useState<Post[]>(post.replies || [])

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

            if (!response.ok) throw new Error('Failed to update post')

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
        if (!confirm('Are you sure you want to delete this reply?')) return

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
            <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-lg p-3 border border-white/10 hover:border-white/20 transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs">
                        {/* Avatar with Initials */}
                        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-[10px] uppercase">
                            {(post.author_name || post.user_id || '??').slice(0, 2)}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-xs">
                                {post.author_name || (post.user_id ? `${post.user_id.slice(0, 8)}...` : 'Unknown')}
                            </span>
                            <span className="text-gray-500">
                                • {formatDate(post.created_at)}
                                {post.updated_at && post.updated_at !== post.created_at && (
                                    <span className="text-gray-600 ml-1">(edited)</span>
                                )}
                            </span>
                            {/* Message Icon after 1 hour */}
                            {isAuthenticated && (!post.created_at || (Date.now() - new Date(post.created_at).getTime() > 3600000)) && currentUserId !== post.user_id && (
                                <Link
                                    href={`/messages?chatWith=${post.user_id}`}
                                    target="_blank"
                                    className="ml-2 text-gray-500 hover:text-amber-400 transition-colors"
                                    title="Message User"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {isOwner && !isEditing && (
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 text-gray-500 hover:text-amber-400 hover:bg-white/5 rounded transition-all"
                                title="Edit"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded transition-all"
                                title="Delete"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleEdit}
                                disabled={isSubmitting}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-all"
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
                                className="px-3 py-1.5 bg-white/10 text-gray-300 rounded text-xs font-medium flex items-center gap-1.5 transition-all"
                            >
                                <X className="w-3 h-3" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-300 text-sm mb-2 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                )}

                {/* Footer */}
                {!isEditing && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <LikeButton
                            likeableId={post.id}
                            likeableType="post"
                            isAuthenticated={isAuthenticated}
                        />
                        {canReply && (
                            <button
                                onClick={() => setShowReplyForm(!showReplyForm)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-amber-400 transition-all text-xs font-medium"
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
                <div className="mt-3 ml-3 bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 rounded-lg p-3">
                    <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        maxLength={5000}
                        rows={3}
                        placeholder={isAuthenticated ? 'Write your reply...' : 'Sign in to reply'}
                        disabled={!isAuthenticated}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between items-center">
                        <span className={`text-xs ${replyContent.length > 4500 ? 'text-amber-400' : 'text-gray-500'}`}>
                            {replyContent.length}/5000
                        </span>
                        <button
                            onClick={handleInlineReply}
                            disabled={!isAuthenticated || !replyContent.trim() || isReplySubmitting}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-lg hover:from-amber-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:shadow-none flex items-center gap-1.5"
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
                        </button>
                    </div>
                </div>
            )}

            {/* Nested Replies */}
            {localReplies && localReplies.length > 0 && (
                <div className="mt-2 border-l-2 border-amber-500/20">
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
