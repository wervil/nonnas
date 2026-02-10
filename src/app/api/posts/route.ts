import { NextRequest, NextResponse } from 'next/server'
import { posts, type NewPost } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { stackServerApp } from '@/stack'
import { moderateContent } from '@/services/moderation'

import { drizzle } from 'drizzle-orm/neon-serverless'


const db = drizzle(process.env.DATABASE_URL!)

// GET /api/posts - Fetch posts for a thread
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const threadId = searchParams.get('thread_id')

        if (!threadId) {
            return NextResponse.json(
                { error: 'thread_id is required' },
                { status: 400 }
            )
        }

        const threadPosts = await db
            .select()
            .from(posts)
            .where(eq(posts.thread_id, parseInt(threadId)))
            .orderBy(posts.created_at) // Oldest first for threads usually

        return NextResponse.json(threadPosts)
    } catch (error) {
        console.error('Error fetching posts:', error)
        return NextResponse.json(
            { error: 'Failed to fetch posts' },
            { status: 500 }
        )
    }
}

// POST /api/posts - Create a new post (reply to thread or post)
export async function POST(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const body = await request.json()
        const { thread_id, parent_post_id, content, attachments } = body

        // Validation
        const hasContent = content && content.trim().length > 0;
        const hasAttachments = attachments && attachments.length > 0;

        if (!thread_id || (!hasContent && !hasAttachments)) {
            return NextResponse.json(
                { error: 'Missing required fields (content or attachments)' },
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

        const isFlagged = hasContent ? await moderateContent(content) : false;
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
            attachments,
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
