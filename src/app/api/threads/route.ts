import { NextRequest, NextResponse } from 'next/server'
import { threads, likes, type NewThread } from '@/db/schema'
import { eq, and, desc, count, sql, getTableColumns } from 'drizzle-orm'
import { stackServerApp } from '@/stack'
import { drizzle } from 'drizzle-orm/neon-serverless'

const db = drizzle(process.env.DATABASE_URL!)

// GET /api/threads - Fetch threads with filters
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const region = searchParams.get('region')
        const scope = searchParams.get('scope') // 'country' or 'state'
        const category = searchParams.get('category')
        const sort = searchParams.get('sort') || 'newest' // 'newest', 'top', 'relevant'

        // Build filters
        const filters = []
        if (region) {
            filters.push(eq(threads.region, region))
        }
        if (scope && (scope === 'country' || scope === 'state')) {
            filters.push(eq(threads.scope, scope))
        }
        if (category) {
            filters.push(eq(threads.category, category))
        }


        // Advanced Query with Joins for Sorting
        let query = db
            .select({
                ...getTableColumns(threads),
                like_count: count(likes.id),
            })
            .from(threads)
            // Join likes
            .leftJoin(likes, and(
                eq(likes.likeable_id, threads.id),
                eq(likes.likeable_type, 'thread')
            ))
            // Apply filters
            .where(and(...filters))
            .groupBy(threads.id);

        if (sort === 'top') {
            query.orderBy(desc(count(likes.id)));
        } else if (sort === 'relevant') {
            query.orderBy(sql`(${count(likes.id)} * 5) + (${threads.view_count} * 1) DESC`);
        } else {
            // Default: Newest
            query.orderBy(desc(threads.created_at));
        }

        const result = await query;
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching threads:', error)
        return NextResponse.json(
            { error: 'Failed to fetch threads' },
            { status: 500 }
        )
    }
}

// POST /api/threads - Create a new thread
export async function POST(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        const body = await request.json()
        const { region, scope, category, title, content } = body

        // Validation
        if (!region || !scope || !category || !title || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate scope
        if (scope !== 'country' && scope !== 'state') {
            return NextResponse.json(
                { error: 'Invalid scope. Must be "country" or "state"' },
                { status: 400 }
            )
        }

        // Validate character limits
        if (title.length > 120) {
            return NextResponse.json(
                { error: 'Title must be 120 characters or less' },
                { status: 400 }
            )
        }

        if (content.length > 5000) {
            return NextResponse.json(
                { error: 'Content must be 5000 characters or less' },
                { status: 400 }
            )
        }

        const newThread: NewThread = {
            region,
            scope,
            category,
            title,
            content,
            user_id: userId,
            author_name: user.displayName || user.id, // Fallback to ID if no display name
        }

        const [thread] = await db.insert(threads).values(newThread).returning()

        return NextResponse.json(thread, { status: 201 })
    } catch (error) {
        console.error('Error creating thread:', error)
        return NextResponse.json(
            { error: 'Failed to create thread' },
            { status: 500 }
        )
    }
}