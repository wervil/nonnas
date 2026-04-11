'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import Button from '../ui/Button'
import CommentEditor, { Attachment } from './CommentEditor'
import CommentItem from './CommentItem'

interface Comment {
    id: number
    recipe_id: number
    parent_comment_id: number | null
    user_id: string
    author_name?: string
    content: string
    depth: number
    created_at: string
    replies: Comment[]
    attachments?: Attachment[]
}

interface CommentSectionProps {
    recipeId: number
    userId?: string
    nonnaName?: string
    photoUrl?: string | null
    onClose?: () => void
}

export default function CommentSection({
    recipeId,
    userId,
    nonnaName = 'Nonna',
    photoUrl,
    onClose,
}: CommentSectionProps) {
    const router = useRouter()
    const [comments, setComments] = useState<Comment[]>([])
    const [loading, setLoading] = useState(true)

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/recipe-comments?recipe_id=${recipeId}`)
            const data = await res.json()
            setComments(data.comments || [])
        } catch (error) {
            console.error('Error fetching comments:', error)
        } finally {
            setLoading(false)
        }
    }, [recipeId])

    useEffect(() => {
        fetchComments()
    }, [fetchComments])

    const handleAddComment = async (content: string, attachments?: Attachment[]) => {
        try {
            const res = await fetch('/api/recipe-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe_id: recipeId,
                    user_id: userId,
                    content,
                    attachments,
                }),
            })

            if (res.ok) {
                const newComment = await res.json()
                setComments(prev => [newComment, ...prev])
            } else {
                const data = await res.json()
                if (res.status === 400) {
                    toast.error(data.error || 'Failed to add comment')
                    return
                }
            }
        } catch (error) {
            console.error('Error adding comment:', error)
        }
    }

    const handleAddReply = (newReply: Comment) => {
        setComments(currentComments => {
            const updateComments = (comments: Comment[]): Comment[] => {
                return comments.map(c => {
                    if (c.id === newReply.parent_comment_id) {
                        return { ...c, replies: [newReply, ...(c.replies || [])] }
                    }
                    if (c.replies) {
                        return { ...c, replies: updateComments(c.replies) }
                    }
                    return c
                })
            }
            return updateComments(currentComments)
        })
    }

    const handleDeleteComment = (commentId: number) => {
        setComments(currentComments => {
            const removeComment = (comments: Comment[]): Comment[] => {
                return comments.filter(c => {
                    if (c.id === commentId) return false
                    if (c.replies) {
                        c.replies = removeComment(c.replies)
                    }
                    return true
                })
            }
            return removeComment(currentComments)
        })
    }

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header — matches DiscussionPanel */}
            <div className="border-b border-gray-200">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {photoUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={photoUrl}
                                    alt={nonnaName}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                            )}
                            <div className="min-w-0">
                                <h2 className="text-xl font-semibold text-gray-900 truncate">
                                    {nonnaName}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    Discussion
                                </p>
                            </div>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 min-h-0">
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Comments
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Share memories and stories about this Nonna&apos;s recipes
                        </p>
                        {!userId && (
                            <Button
                                onClick={() => router.push('/handler/sign-in')}
                                className="w-full"
                            >
                                Sign In to Join
                            </Button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-3 py-8">
                            <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-gray-600 text-sm">
                                Loading comments...
                            </span>
                        </div>
                    ) : comments.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-8">
                            No comments yet. Be the first to share.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {comments.map((comment) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    userId={userId}
                                    onAddReply={handleAddReply}
                                    onDelete={handleDeleteComment}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Composer — in-flow footer */}
            {userId && (
                <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
                    <CommentEditor
                        onSubmit={handleAddComment}
                        onCancel={() => { }}
                        placeholder="Share your thoughts about this recipe..."
                    />
                </div>
            )}
        </div>
    )
}
