'use client'

import { useState, useEffect, useCallback } from 'react'
import CommentItem from './CommentItem'
import CommentEditor from './CommentEditor'
import Link from 'next/link'

interface Comment {
    id: number
    recipe_id: number
    parent_comment_id: number | null
    user_id: string
    content: string
    depth: number
    created_at: string
    replies: Comment[]
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
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [showEditor, setShowEditor] = useState(false)

    const fetchComments = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/recipe-comments?recipe_id=${recipeId}`)
            const data = await res.json()
            setComments(data.comments || [])
            setCount(data.count || 0)
        } catch (error) {
            console.error('Error fetching comments:', error)
        } finally {
            setLoading(false)
        }
    }, [recipeId])

    useEffect(() => {
        fetchComments()
    }, [fetchComments])

    const handleAddComment = async (content: string) => {
        try {
            const res = await fetch('/api/recipe-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe_id: recipeId,
                    user_id: userId,
                    content,
                }),
            })

            if (res.ok) {
                fetchComments()
                setShowEditor(false)
            }
        } catch (error) {
            console.error('Error adding comment:', error)
        }
    }

    if (loading) return <div className="p-4 text-white">Loading comments...</div>

    return (
        <div className="comments-section mt-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Comments ({count})</h3>
                {userId && !showEditor && (
                    <button
                        onClick={() => setShowEditor(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Add Comment
                    </button>
                )}
                {!userId && (
                    <Link
                        href="/handler/sign-in"
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Sign in to comment
                    </Link>
                )}
            </div>

            {showEditor && (
                <div className="mb-6">
                    <CommentEditor
                        onSubmit={handleAddComment}
                        onCancel={() => setShowEditor(false)}
                    />
                </div>
            )}

            <div className="space-y-4 mt-6">
                {comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        userId={userId}
                        onUpdate={fetchComments}
                    />
                ))}
            </div>

            {comments.length === 0 && (
                <p className="text-white text-center py-8">
                    No comments yet. Be the first to comment!
                </p>
            )}
        </div>
    )
}
