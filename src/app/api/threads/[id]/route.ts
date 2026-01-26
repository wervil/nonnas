import { NextRequest, NextResponse } from 'next/server'
import { threads, posts, likes } from '@/db/schema'
import { eq, sql, and, count } from 'drizzle-orm'
import { stackServerApp } from '@/stack'


import { drizzle } from 'drizzle-orm/neon-serverless'


const db = drizzle(process.env.DATABASE_URL!)

// GET /api/threads/[id] - Fetch a single thread by ID with likes and posts
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const threadId = parseInt(id)

        if (isNaN(threadId)) {
            return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 })
        }

        // Get current user (if authenticated)
        let currentUserId: string | null = null
        try {
            const user = await stackServerApp.getUser()
            currentUserId = user?.id || null
        } catch {
            // User not authenticated, continue without user ID
        }

        // Increment view count
        await db
            .update(threads)
            .set({ view_count: sql`${threads.view_count} + 1` })
            .where(eq(threads.id, threadId))

        // Fetch thread
        const [thread] = await db
            .select()
            .from(threads)
            .where(eq(threads.id, threadId))

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        // Fetch total like count for this thread
        const likeCountResult = await db
            .select({ count: count() })
            .from(likes)
            .where(
                and(
                    eq(likes.likeable_id, threadId),
                    eq(likes.likeable_type, 'thread')
                )
            )

        const likeCount = likeCountResult[0]?.count || 0

        // Check if current user has liked this thread
        let userHasLiked = false
        if (currentUserId) {
            const userLike = await db
                .select()
                .from(likes)
                .where(
                    and(
                        eq(likes.user_id, currentUserId),
                        eq(likes.likeable_id, threadId),
                        eq(likes.likeable_type, 'thread')
                    )
                )
            userHasLiked = userLike.length > 0
        }

        // Fetch all posts for this thread, ordered by creation date
        // Fetch all posts for this thread, ordered by creation date
        const threadPosts = await db
            .select()
            .from(posts)
            .where(eq(posts.thread_id, threadId))
            .orderBy(posts.created_at)

        // Check for missing author names and backfill
        const missingUserIds = new Set<string>()
        threadPosts.forEach((p) => {
            if (!p.author_name || p.author_name === p.user_id) {
                missingUserIds.add(p.user_id)
            }
        })

        if (missingUserIds.size > 0) {
            const updates = Array.from(missingUserIds).map(async (userId) => {
                try {
                    const user = await stackServerApp.getUser(userId)
                    const displayName = user?.displayName || '--'

                    if (user) {
                        // Update in memory
                        threadPosts.forEach((p) => {
                            if (p.user_id === userId && (!p.author_name || p.author_name === userId)) {
                                p.author_name = displayName
                            }
                        })

                        // Persist to DB
                        await db
                            .update(posts)
                            .set({ author_name: displayName })
                            .where(eq(posts.user_id, userId))
                    }
                } catch (error) {
                    console.error(`Failed to backfill user ${userId}:`, error)
                }
            })

            await Promise.all(updates)
        }

        // Return enriched thread data
        return NextResponse.json({
            ...thread,
            like_count: likeCount,
            user_has_liked: userHasLiked,
            posts: threadPosts,
        })
    } catch (error) {
        console.error('Error fetching thread:', error)
        return NextResponse.json(
            { error: 'Failed to fetch thread' },
            { status: 500 }
        )
    }
}

// DELETE /api/threads/[id] - Delete a thread
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const { id } = await params
        const threadId = parseInt(id)

        if (isNaN(threadId)) {
            return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 })
        }

        // Check ownership
        const [thread] = await db
            .select()
            .from(threads)
            .where(eq(threads.id, threadId))

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        if (thread.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Delete thread (cascade will delete posts)
        await db.delete(threads).where(eq(threads.id, threadId))

        return NextResponse.json({ message: 'Thread deleted successfully' })
    } catch (error) {
        console.error('Error deleting thread:', error)
        return NextResponse.json(
            { error: 'Failed to delete thread' },
            { status: 500 }
        )
    }
}