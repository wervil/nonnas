'use client'

import { useState } from 'react'
import { Post } from '@/db/schema'
import LikeButton from '../LikeButton'
import { Reply, Trash2, Edit2 } from 'lucide-react'

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
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    return (
        <div
            className="border-l-2 border-gray-200 pl-4 py-3"
            style={{ marginLeft: `${(post.depth || 0) * 20}px` }}
        >
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{post.user_id}</span>
                        <span>•</span>
                        <span>{formatDate(post.created_at)}</span>
                        {post.updated_at && post.updated_at !== post.created_at && (
                            <span className="text-gray-500">(edited)</span>
                        )}
                    </div>

                    {/* Actions */}
                    {isOwner && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-gray-500 hover:text-blue-600 transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDelete}
                                className="text-gray-500 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
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
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleEdit}
                                disabled={isSubmitting}
                                className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 text-sm"
                            >
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false)
                                    setEditContent(post.content)
                                }}
                                className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.content}</p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3">
                    <LikeButton
                        likeableId={post.id}
                        likeableType="post"
                        isAuthenticated={isAuthenticated}
                    />
                    {canReply && onReply && (
                        <button
                            onClick={() => onReply(post.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm"
                        >
                            <Reply className="w-4 h-4" />
                            <span>Reply</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Nested Replies */}
            {post.replies && post.replies.length > 0 && (
                <div className="mt-2">
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
