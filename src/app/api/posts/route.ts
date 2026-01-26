import { NextRequest, NextResponse } from 'next/server'
import { posts, type NewPost } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { stackServerApp } from '@/stack'
import { moderateContent } from '@/services/moderation'

import { drizzle } from 'drizzle-orm/neon-serverless'


const db = drizzle(process.env.DATABASE_URL!)

// POST /api/posts - Create a new post (reply to thread or post)
export async function POST(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const body = await request.json()
        const { thread_id, parent_post_id, content } = body

        // Validation
        if (!thread_id || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (content.length > 5000) {
            return NextResponse.json(
                { error: 'Content must be 5000 characters or less' },
                { status: 400 }
            )
        }

        // Calculate depth
        let depth = 0
        if (parent_post_id) {
            const [parentPost] = await db
                .select()
                .from(posts)
                .where(eq(posts.id, parent_post_id))

            if (!parentPost) {
                return NextResponse.json(
                    { error: 'Parent post not found' },
                    { status: 404 }
                )
            }

            depth = (parentPost.depth || 0) + 1

            // Enforce max depth of 5
            if (depth > 5) {
                return NextResponse.json(
                    { error: 'Maximum nesting depth (5) exceeded' },
                    { status: 400 }
                )
            }
        }

        const isFlagged = await moderateContent(content)
        if (isFlagged) {
            return NextResponse.json(
                { error: 'Content flagged as inappropriate.' },
                { status: 400 }
            )
        }

        const newPost: NewPost = {
            thread_id,
            parent_post_id: parent_post_id || null,
            user_id: userId,
            author_name: user.displayName || '--', // Fallback to '--'
            content,
            depth,
        }

        const [post] = await db.insert(posts).values(newPost).returning()

        return NextResponse.json(post, { status: 201 })
    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json(
            { error: 'Failed to create post' },
            { status: 500 }
        )
    }
}
