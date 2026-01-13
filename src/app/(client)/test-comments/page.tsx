'use client'

import CommentSection from '@/components/Comments/CommentSection'
import { useUser } from '@stackframe/stack'

export default function TestCommentsPage() {
    const user = useUser()

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold mb-4">Test Comments Page</h1>
                <p className="text-gray-600 mb-8">
                    This is a test page to view the comments UI. Using recipe_id = 1 for testing.
                </p>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-semibold mb-4">Sample Recipe</h2>
                    <p className="text-gray-700 mb-6">
                        This is where recipe content would go. Below you&apos;ll see the comments section.
                    </p>

                    <CommentSection recipeId={1} userId={user?.id} />
                </div>
            </div>
        </div>
    )
}
