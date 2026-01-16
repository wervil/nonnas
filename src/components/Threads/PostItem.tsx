'use client'

import { useState } from 'react'
import { Post } from '@/db/schema'
import LikeButton from '../LikeButton'
import { Reply, Trash2, Edit2, User, Loader2, Check, X } from 'lucide-react'

interface PostItemProps {
    post: Post & { replies?: PostItemProps['post'][] }
    threadId: number
    currentUserId?: string
    isAuthenticated: boolean
    onReply?: (postId: number) => void
    onDelete?: (postId: number) => void
    onEdit?: (postId: number, content: string) => void
}

export default function PostItem({
    post,
    threadId,
    currentUserId,
    isAuthenticated,
    onReply,
    onDelete,
    onEdit,
}: PostItemProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editContent, setEditContent] = useState(post.content)
    const [isSubmitting, setIsSubmitting] = useState(false)

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
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center">
                            <User className="w-3 h-3 text-amber-400" />
                        </div>
                        <div>
                            <span className="font-medium text-white text-xs">
                                {post.user_id?.slice(0, 8)}...
                            </span>
                            <span className="text-gray-500 ml-2">
                                {formatDate(post.created_at)}
                                {post.updated_at && post.updated_at !== post.created_at && (
                                    <span className="text-gray-600 ml-1">(edited)</span>
                                )}
                            </span>
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
                        {canReply && onReply && (
                            <button
                                onClick={() => onReply(post.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-amber-400 transition-all text-xs font-medium"
                            >
                                <Reply className="w-3 h-3" />
                                <span>Reply</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Nested Replies */}
            {post.replies && post.replies.length > 0 && (
                <div className="mt-2 border-l-2 border-amber-500/20">
                    {post.replies.map((reply) => (
                        <PostItem
                            key={reply.id}
                            post={reply}
                            threadId={threadId}
                            currentUserId={currentUserId}
                            isAuthenticated={isAuthenticated}
                            onReply={onReply}
                            onDelete={onDelete}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
