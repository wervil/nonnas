'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CreateThreadFormProps {
    region: string
    scope: 'country' | 'state'
    onSuccess?: () => void
}

const CATEGORIES = [
    'General',
    'Recipes',
    'Techniques',
    'Culture',
    'Ingredients',
    'History',
]

export default function CreateThreadForm({
    region,
    scope,
    onSuccess,
}: CreateThreadFormProps) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [category, setCategory] = useState('General')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation
        if (title.length > 120) {
            setError('Title must be 120 characters or less')
            return
        }

        if (content.length > 5000) {
            setError('Content must be 5000 characters or less')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/threads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    region,
                    scope,
                    category,
                    title,
                    content,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create thread')
            }

            const thread = await response.json()

            // Reset form
            setTitle('')
            setContent('')
            setCategory('General')

            if (onSuccess) {
                onSuccess()
            } else {
                router.push(`/community/thread/${thread.id}`)
            }
        } catch (err: any) {
            console.error('Error creating thread:', err)
            setError(err.message || 'Failed to create thread')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* Category */}
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                </label>
                <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-gray-500">({title.length}/120)</span>
                </label>
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="What's your discussion about?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Content */}
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-gray-500">({content.length}/5000)</span>
                </label>
                <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={5000}
                    required
                    rows={8}
                    placeholder="Share your thoughts, questions, or stories..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
            </div>

            {/* Region and Scope Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600">
                <p>
                    <strong>Region:</strong> {region} •{' '}
                    <strong>Scope:</strong> {scope === 'country' ? 'Country' : 'State'}
                </p>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || !title || !content}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
                {isSubmitting ? 'Creating...' : 'Create Discussion'}
            </button>
        </form>
    )
}
