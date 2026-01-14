import { NextRequest, NextResponse } from 'next/server'
import { likes } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { stackServerApp } from '@/stack'
import { drizzle } from 'drizzle-orm/neon-serverless'


const db = drizzle(process.env.DATABASE_URL!)

// POST /api/likes - Toggle like on content (thread, post, or comment)
export async function POST(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const body = await request.json()
        const { likeable_id, likeable_type } = body

        // Validation
        if (!likeable_id || !likeable_type) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate likeable_type
        const validTypes = ['thread', 'post', 'comment']
        if (!validTypes.includes(likeable_type)) {
            return NextResponse.json(
                { error: 'Invalid likeable_type. Must be "thread", "post", or "comment"' },
                { status: 400 }
            )
        }

        // Check if like already exists
        const existingLike = await db
            .select()
            .from(likes)
            .where(
                and(
                    eq(likes.user_id, userId),
                    eq(likes.likeable_id, likeable_id),
                    eq(likes.likeable_type, likeable_type)
                )
            )

        if (existingLike.length > 0) {
            // Unlike - delete the like
            await db
                .delete(likes)
                .where(
                    and(
                        eq(likes.user_id, userId),
                        eq(likes.likeable_id, likeable_id),
                        eq(likes.likeable_type, likeable_type)
                    )
                )

            return NextResponse.json({ liked: false, message: 'Like removed' })
        } else {
            // Like - create new like
            const [newLike] = await db
                .insert(likes)
                .values({
                    user_id: userId,
                    likeable_id,
                    likeable_type,
                })
                .returning()

            return NextResponse.json({ liked: true, like: newLike }, { status: 201 })
        }
    } catch (error) {
        console.error('Error toggling like:', error)
        return NextResponse.json(
            { error: 'Failed to toggle like' },
            { status: 500 }
        )
    }
}
