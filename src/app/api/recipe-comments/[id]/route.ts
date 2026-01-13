import { NextRequest, NextResponse } from 'next/server'

import { drizzle } from 'drizzle-orm/neon-serverless'
import { recipe_comments } from '@/db/schema'
import { eq } from 'drizzle-orm'


const db = drizzle(process.env.DATABASE_URL!)

export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const body = await request.json()
        const { user_id, content } = body
        const commentId = parseInt(params.id)

        // Fetch existing comment
        const [existing] = await db
            .select()
            .from(recipe_comments)
            .where(eq(recipe_comments.id, commentId))
            .limit(1)

        if (!existing) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
        }

        // Check ownership
        if (existing.user_id !== user_id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Update
        const [updated] = await db
            .update(recipe_comments)
            .set({ content, updated_at: new Date() })
            .where(eq(recipe_comments.id, commentId))
            .returning()

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating comment:', error)
        return NextResponse.json(
            { error: 'Failed to update comment' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const searchParams = request.nextUrl.searchParams
        const userId = searchParams.get('user_id')
        const commentId = parseInt(params.id)

        // Fetch existing comment
        const [existing] = await db
            .select()
            .from(recipe_comments)
            .where(eq(recipe_comments.id, commentId))
            .limit(1)

        if (!existing) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
        }

        // Check ownership
        if (existing.user_id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Delete (cascade will handle replies)
        await db.delete(recipe_comments).where(eq(recipe_comments.id, commentId))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting comment:', error)
        return NextResponse.json(
            { error: 'Failed to delete comment' },
            { status: 500 }
        )
    }
}
