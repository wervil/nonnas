'use client'

import { useState } from 'react'

interface CommentEditorProps {
    onSubmit: (content: string) => Promise<void>
    onCancel: () => void
}

export default function CommentEditor({
    onSubmit,
    onCancel,
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
        <div className="comment-editor bg-white border rounded-lg p-4">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                className="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                maxLength={2000}
                autoFocus
            />
            <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">
                    {remaining} characters remaining
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        disabled={loading || !content.trim()}
                    >
                        {loading ? 'Posting...' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    )
}
