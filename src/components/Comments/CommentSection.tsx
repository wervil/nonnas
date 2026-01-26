'use client'

import { useState, useEffect, useCallback } from 'react'
import CommentItem from './CommentItem'
import CommentEditor from './CommentEditor'
import Link from 'next/link'
import { toast } from 'sonner'

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
                const newComment = await res.json()
                setComments(prev => [newComment, ...prev])
                setCount(prev => prev + 1)
                setShowEditor(false)
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
        setCount(prev => prev + 1)
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
        setCount(prev => Math.max(0, prev - 1))
    }
    if (loading) {
        return (
            <div className="comments-section p-6">
                <div className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-[var(--color-primary-border)] border-t-[var(--color-primary-main)] rounded-full animate-spin" />
                    <span className="text-[var(--color-yellow-light)] font-[var(--font-bell)] italic">
                        Loading comments...
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="comments-section">
            {/* Header with decorative elements */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--color-primary-border)]/30">
                {/* Decorative quill icon */}
                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary-focus)] border border-[var(--color-primary-border)]">
                    <svg className="w-6 h-6 text-[var(--color-primary-main)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>

                <div className="flex-1">
                    <h3 className="font-[var(--font-imprint)] text-2xl text-[var(--color-yellow-light)] tracking-wide">
                        Discussions
                    </h3>
                    <p className="text-sm text-[var(--color-text-pale)] font-[var(--font-bell)] italic mt-0.5">
                        {count === 0 ? 'Be the first to share your thoughts' : `${count} note${count !== 1 ? 's' : ''} shared`}
                    </p>
                </div>

                {/* Add Comment Button */}
                {userId && !showEditor && (
                    <button
                        onClick={() => setShowEditor(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary-secondary)] 
                                 text-[var(--color-primary-main)] rounded-lg border border-[var(--color-primary-border)]
                                 hover:bg-[var(--color-primary-focus)] transition-all duration-200
                                 font-[var(--font-bell)] text-sm shadow-sm hover:shadow-md group"
                    >
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Add a Note</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                )}

                {!userId && (
                    <Link
                        href="/handler/sign-in"
                        className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary-secondary)] 
                                 text-[var(--color-primary-main)] rounded-lg border border-[var(--color-primary-border)]
                                 hover:bg-[var(--color-primary-focus)] transition-all duration-200
                                 font-[var(--font-bell)] text-sm shadow-sm hover:shadow-md group no-underline"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#5f5f13">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden sm:inline text-[#5f5f13]">Sign in to comment</span>
                        <span className="sm:hidden">Sign in</span>
                    </Link>
                )}
            </div>

            {/* Editor */}
            {showEditor && (
                <div className="mb-8">
                    <CommentEditor
                        onSubmit={handleAddComment}
                        onCancel={() => setShowEditor(false)}
                        placeholder="Share your memories, tips, or variations of this recipe..."
                    />
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
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

            {/* Empty State */}
            {comments.length === 0 && (
                <div className="text-center py-12 px-6">
                    {/* Decorative cookbook illustration */}
                    <div className="mx-auto w-20 h-20 rounded-full bg-[var(--color-primary-focus)]/50 
                                  flex items-center justify-center mb-4 border border-[var(--color-primary-border)]/30">
                        <svg className="w-10 h-10 text-[var(--color-yellow-light)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h4 className="font-[var(--font-imprint)] text-xl text-[var(--color-yellow-light)] mb-2">
                        No notes yet
                    </h4>
                    <p className="text-[var(--color-text-pale)] font-[var(--font-bell)] text-sm max-w-sm mx-auto leading-relaxed">
                        Every family recipe tells a story. Share your memories, cooking tips, or how you&apos;ve made this dish your own.
                    </p>
                    {userId && !showEditor && (
                        <button
                            onClick={() => setShowEditor(true)}
                            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 
                                     bg-[var(--color-primary-main)] text-white rounded-lg 
                                     hover:bg-[var(--color-primary-hover)] transition-all duration-200
                                     font-[var(--font-bell)] shadow-sm hover:shadow-md"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Write the first note
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
