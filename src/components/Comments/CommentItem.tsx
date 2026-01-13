'use client'

import { useState } from 'react'
import CommentEditor from './CommentEditor'

interface Comment {
    id: number
    recipe_id: number
    user_id: string
    content: string
    depth: number
    created_at: string
    replies: Comment[]
}

interface CommentItemProps {
    comment: Comment
    userId?: string
    onUpdate: () => void
}

export default function CommentItem({
    comment,
    userId,
    onUpdate,
}: CommentItemProps) {
    const [showReplyEditor, setShowReplyEditor] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleReply = async (content: string) => {
        try {
            const res = await fetch('/api/recipe-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipe_id: comment.recipe_id,
                    parent_comment_id: comment.id,
                    user_id: userId,
                    content,
                }),
            })

            if (res.ok) {
                onUpdate()
                setShowReplyEditor(false)
            }
        } catch (error) {
            console.error('Error replying:', error)
        }
    }

    const confirmDelete = async () => {
        try {
            const res = await fetch(
                `/api/recipe-comments/${comment.id}?user_id=${userId}`,
                { method: 'DELETE' }
            )

            if (res.ok) {
                onUpdate()
            }
        } catch (error) {
            console.error('Error deleting:', error)
        }
    }

    const isOwner = userId === comment.user_id
    const canReply = comment.depth < 5

    return (
        <div className={`comment-item ${comment.depth > 0 ? 'ml-8' : ''}`}>
            <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold">{comment.user_id}</span>
                            <span className="text-sm text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                </div>

                <div className="flex gap-4 mt-3 text-sm">
                    {userId && canReply && (
                        <button
                            onClick={() => setShowReplyEditor(!showReplyEditor)}
                            className="text-blue-600 hover:underline"
                        >
                            Reply
                        </button>
                    )}
                    {isOwner && (
                        <>
                            {showDeleteConfirm ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={confirmDelete}
                                        className="text-red-700 font-semibold hover:underline"
                                    >
                                        Confirm delete
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="text-gray-600 hover:underline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            )}
                        </>
                    )}
                </div>

                {showReplyEditor && (
                    <div className="mt-4">
                        <CommentEditor
                            onSubmit={handleReply}
                            onCancel={() => setShowReplyEditor(false)}
                        />
                    </div>
                )}
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            userId={userId}
                            onUpdate={onUpdate}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
