'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
}

export default function CommentSection({
    recipeId,
    userId,
}: CommentSectionProps) {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-3 py-8">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#6BA8A3] rounded-full animate-spin" />
                <span className="text-[#6BA8A3] font-['Inter'] text-sm">
                    Loading comments...
                </span>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Recipe Name Section */}
            <div className="flex items-start w-full mb-6 px-6 shrink-0">
                <div className="flex items-center">
                    <p className="font-['Inter'] font-semibold text-lg leading-7 text-[#4A7C7A]">
                        Recipe Name
                    </p>
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 pb-32">
                <div className="flex flex-col gap-4 w-full">
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
            </div>

            {/* Empty State - shown when no comments and not logged in */}
            {comments.length === 0 && !userId && (
                <div className="text-center py-8 px-6 shrink-0">
                    <p className="text-[#6BA8A3] text-sm">No comments yet. Sign in to join the conversation!</p>
                </div>
            )}

            {/* Comment Input - Fixed at bottom */}
            {userId && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-4 pb-6 shadow-lg">
                    <div className="max-w-[400px] lg:max-w-[600px] mx-auto">
                        <CommentEditor
                            onSubmit={handleAddComment}
                            onCancel={() => { }}
                            placeholder="Share your thoughts about this recipe..."
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
