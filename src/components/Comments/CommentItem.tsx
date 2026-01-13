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

// Format date to be more elegant
const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
        const minutes = Math.floor(diffInHours * 60)
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
        const hours = Math.floor(diffInHours)
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 48) {
        return 'Yesterday'
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        })
    }
}

// Generate initials from user ID
const getInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase()
}

// Generate a consistent color based on user ID
const getAvatarColor = (userId: string) => {
    const colors = [
        'bg-[#8B4513]', // saddle brown
        'bg-[#5f5f13]', // green dark
        'bg-[#6B4423]', // dark tan
        'bg-[#4a3728]', // deep brown
        'bg-[#2e231e]', // brown pale
        'bg-[#654321]', // dark brown
    ]
    const index = userId.charCodeAt(0) % colors.length
    return colors[index]
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
        <div className={`comment-item ${comment.depth > 0 ? 'ml-6 md:ml-10' : ''}`}>
            <div className={`
                relative p-4 rounded-lg transition-all duration-200
                ${comment.depth === 0
                    ? 'bg-[var(--color-primary-secondary)] border border-[var(--color-primary-border)]'
                    : 'bg-white/60 border border-[var(--color-primary-border)]/50'
                }
            `}>
                {/* Reply indicator line */}
                {comment.depth > 0 && (
                    <div className="absolute -left-6 md:-left-10 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--color-primary-border)] to-transparent" />
                )}

                <div className="flex gap-3">
                    {/* Avatar */}
                    <div className={`
                        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                        ${getAvatarColor(comment.user_id)} text-white text-sm font-semibold
                        shadow-sm
                    `}>
                        {getInitials(comment.user_id)}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-[var(--font-imprint)] text-[var(--color-primary-main)] truncate">
                                {comment.user_id.length > 12 ? `${comment.user_id.slice(0, 12)}...` : comment.user_id}
                            </span>
                            <span className="text-[var(--color-text-pale)] text-xs">•</span>
                            <span className="text-[var(--color-text-pale)] text-xs italic font-[var(--font-bell)]">
                                {formatDate(comment.created_at)}
                            </span>
                            {isOwner && (
                                <span className="px-2 py-0.5 text-xs bg-[var(--color-primary-focus)] text-[var(--color-primary-main)] rounded-full font-[var(--font-bell)]">
                                    You
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <p className="mt-2 text-[var(--color-brown-dark)] font-[var(--font-bell)] leading-relaxed whitespace-pre-wrap break-words">
                            {comment.content}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-[var(--color-primary-border)]/20">
                            {userId && canReply && (
                                <button
                                    onClick={() => setShowReplyEditor(!showReplyEditor)}
                                    className="flex items-center gap-1.5 text-sm text-[var(--color-primary-main)] 
                                             hover:text-[var(--color-primary-hover)] transition-colors duration-200 
                                             font-[var(--font-bell)] group"
                                >
                                    <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    <span>{showReplyEditor ? 'Cancel Reply' : 'Reply'}</span>
                                </button>
                            )}

                            {isOwner && (
                                <>
                                    {showDeleteConfirm ? (
                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                            <span className="text-xs text-[var(--color-danger-main)] font-[var(--font-bell)]">Delete this comment?</span>
                                            <button
                                                onClick={confirmDelete}
                                                className="px-2 py-1 text-xs bg-[var(--color-danger-main)] text-white rounded 
                                                         hover:bg-[var(--color-danger-hover)] transition-colors font-[var(--font-bell)]"
                                            >
                                                Yes, delete
                                            </button>
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="px-2 py-1 text-xs text-[var(--color-primary-main)] hover:bg-[var(--color-primary-focus)] 
                                                         rounded transition-colors font-[var(--font-bell)]"
                                            >
                                                Keep it
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-1.5 text-sm text-[var(--color-danger-main)] 
                                                     hover:text-[var(--color-danger-hover)] transition-colors duration-200 
                                                     font-[var(--font-bell)] group"
                                        >
                                            <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Delete</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Reply Editor */}
                        {showReplyEditor && (
                            <div className="mt-4">
                                <CommentEditor
                                    onSubmit={handleReply}
                                    onCancel={() => setShowReplyEditor(false)}
                                    placeholder="Write your reply..."
                                    isReply={true}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-3 relative">
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
