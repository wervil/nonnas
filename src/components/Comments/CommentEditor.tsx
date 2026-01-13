'use client'

import { useState } from 'react'

interface CommentEditorProps {
    onSubmit: (content: string) => Promise<void>
    onCancel: () => void
    placeholder?: string
    isReply?: boolean
}

export default function CommentEditor({
    onSubmit,
    onCancel,
    placeholder = "Share your thoughts on this recipe...",
    isReply = false,
}: CommentEditorProps) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!content.trim()) return

        setLoading(true)
        try {
            await onSubmit(content)
            setContent('')
        } catch (error) {
            console.error('Error submitting comment:', error)
        } finally {
            setLoading(false)
        }
    }

    const remaining = 2000 - content.length

    return (
        <div className={`comment-editor relative ${isReply ? 'mt-3' : ''}`}>
            {/* Decorative corner flourishes */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[var(--color-primary-border)] rounded-tl-sm opacity-60" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[var(--color-primary-border)] rounded-tr-sm opacity-60" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[var(--color-primary-border)] rounded-bl-sm opacity-60" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[var(--color-primary-border)] rounded-br-sm opacity-60" />

            <div className="bg-[var(--color-primary-secondary)] border border-[var(--color-primary-border)] rounded-lg p-4 shadow-sm">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-3 bg-white/80 border border-[var(--color-primary-border)] rounded-md 
                             resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-border)] 
                             focus:border-transparent transition-all duration-200
                             font-[var(--font-bell)] text-[var(--color-primary-main)] placeholder:text-[var(--color-text-pale)]
                             placeholder:italic"
                    rows={isReply ? 3 : 4}
                    maxLength={2000}
                    autoFocus
                />

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-primary-border)]/30">
                    <span className="text-sm text-[var(--color-text-pale)] italic font-[var(--font-bell)]">
                        {remaining} characters remaining
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-[var(--color-primary-main)] hover:bg-[var(--color-primary-focus)] 
                                     rounded-md transition-colors duration-200 font-[var(--font-bell)] text-sm"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-5 py-2 bg-[var(--color-primary-main)] text-white rounded-md 
                                     hover:bg-[var(--color-primary-hover)] disabled:opacity-50 
                                     disabled:cursor-not-allowed transition-all duration-200
                                     font-[var(--font-bell)] text-sm shadow-sm hover:shadow-md
                                     flex items-center gap-2"
                            disabled={loading || !content.trim()}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Posting...</span>
                                </>
                            ) : (
                                <span>{isReply ? 'Reply' : 'Post Comment'}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
