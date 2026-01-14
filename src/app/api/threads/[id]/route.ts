import { NextRequest, NextResponse } from 'next/server'
import { threads } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { stackServerApp } from '@/stack'


import { drizzle } from 'drizzle-orm/neon-serverless'


const db = drizzle(process.env.DATABASE_URL!)

// GET /api/threads/[id] - Fetch a single thread by ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const threadId = parseInt(params.id)

        if (isNaN(threadId)) {
            return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 })
        }

        // Increment view count
        await db
            .update(threads)
            .set({ view_count: sql`${threads.view_count} + 1` })
            .where(eq(threads.id, threadId))

        const [thread] = await db
            .select()
            .from(threads)
            .where(eq(threads.id, threadId))

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        return NextResponse.json(thread)
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
    { params }: { params: { id: string } }
) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const threadId = parseInt(params.id)

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
