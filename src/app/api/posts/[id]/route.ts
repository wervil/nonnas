import { NextRequest, NextResponse } from 'next/server'
import { posts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { stackServerApp } from '@/stack'


import { drizzle } from 'drizzle-orm/neon-serverless'


const db = drizzle(process.env.DATABASE_URL!)

// PATCH /api/posts/[id] - Update a post
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const postId = parseInt(params.id)

        if (isNaN(postId)) {
            return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
        }

        const body = await request.json()
        const { content } = body

        if (!content) {
            return NextResponse.json(
                { error: 'Content is required' },
                { status: 400 }
            )
        }

        if (content.length > 5000) {
            return NextResponse.json(
                { error: 'Content must be 5000 characters or less' },
                { status: 400 }
            )
        }

        // Check ownership
        const [post] = await db.select().from(posts).where(eq(posts.id, postId))

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        if (post.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Update post
        const [updatedPost] = await db
            .update(posts)
            .set({ content, updated_at: new Date() })
            .where(eq(posts.id, postId))
            .returning()

        return NextResponse.json(updatedPost)
    } catch (error) {
        console.error('Error updating post:', error)
        return NextResponse.json(
            { error: 'Failed to update post' },
            { status: 500 }
        )
    }
}

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const postId = parseInt(params.id)

        if (isNaN(postId)) {
            return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
        }

        // Check ownership
        const [post] = await db.select().from(posts).where(eq(posts.id, postId))

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        if (post.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete post (cascade will delete child posts)
        await db.delete(posts).where(eq(posts.id, postId))

        return NextResponse.json({ message: 'Post deleted successfully' })
    } catch (error) {
        console.error('Error deleting post:', error)
        return NextResponse.json(
            { error: 'Failed to delete post' },
            { status: 500 }
        )
    }
}
