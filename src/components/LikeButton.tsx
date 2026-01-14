'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface LikeButtonProps {
    likeableId: number
    likeableType: 'thread' | 'post' | 'comment'
    initialLiked?: boolean
    initialCount?: number
    isAuthenticated: boolean
}

export default function LikeButton({
    likeableId,
    likeableType,
    initialLiked = false,
    initialCount = 0,
    isAuthenticated,
}: LikeButtonProps) {
    const [liked, setLiked] = useState(initialLiked)
    const [count, setCount] = useState(initialCount)
    const [isLoading, setIsLoading] = useState(false)

    const handleLike = async () => {
        if (!isAuthenticated) {
            // Redirect to sign-in
            window.location.href = '/handler/sign-in'
            return
        }

        // Optimistic update
        const previousLiked = liked
        const previousCount = count
        setLiked(!liked)
        setCount(liked ? count - 1 : count + 1)
        setIsLoading(true)

        try {
            const response = await fetch('/api/likes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    likeable_id: likeableId,
                    likeable_type: likeableType,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to toggle like')
            }

            const data = await response.json()
            setLiked(data.liked)
        } catch (error) {
            console.error('Error toggling like:', error)
            // Revert optimistic update
            setLiked(previousLiked)
            setCount(previousCount)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleLike}
            disabled={isLoading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full transition-all ${liked
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={isAuthenticated ? (liked ? 'Unlike' : 'Like') : 'Sign in to like'}
        >
            <Heart
                className={`w-4 h-4 ${liked ? 'fill-current' : ''}`}
                strokeWidth={2}
            />
            <span className="text-sm font-medium">{count}</span>
        </button>
    )
}
