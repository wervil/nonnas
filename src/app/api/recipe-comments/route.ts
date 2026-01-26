import { NextRequest, NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { recipe_comments } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { stackServerApp } from '@/stack'
import { moderateContent } from '@/services/moderation'

const db = drizzle(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const recipeId = searchParams.get('recipe_id')

        if (!recipeId) {
            return NextResponse.json(
                { error: 'recipe_id is required' },
                { status: 400 }
            )
        }

        // Fetch all comments for this recipe
        const comments = await db
            .select()
            .from(recipe_comments)
            .where(eq(recipe_comments.recipe_id, parseInt(recipeId)))
            .orderBy(desc(recipe_comments.created_at))

        // Check for missing author names and backfill
        const missingUserIds = new Set<string>()
        comments.forEach((c) => {
            if (!c.author_name || c.author_name === c.user_id) {
                missingUserIds.add(c.user_id)
            }
        })

        if (missingUserIds.size > 0) {
            const updates = Array.from(missingUserIds).map(async (userId) => {
                try {
                    const user = await stackServerApp.getUser(userId)
                    const displayName = user?.displayName || '--'

                    if (user) {
                        // Update in memory
                        comments.forEach((c) => {
                            if (c.user_id === userId && (!c.author_name || c.author_name === userId)) {
                                c.author_name = displayName
                            }
                        })

                        // Persist to DB
                        // We update all comments by this user that don't have a name
                        // to ensure future requests are fast
                        await db
                            .update(recipe_comments)
                            .set({ author_name: displayName })
                            .where(eq(recipe_comments.user_id, userId))
                    }
                } catch (error) {
                    console.error(`Failed to backfill user ${userId}:`, error)
                }
            })

            await Promise.all(updates)
        }

        // Build nested structure
        type Comment = typeof recipe_comments.$inferSelect
        interface CommentWithReplies extends Comment {
            replies: CommentWithReplies[]
        }

        const commentMap = new Map<number, CommentWithReplies>()
        const rootComments: CommentWithReplies[] = []

        comments.forEach((comment) => {
            commentMap.set(comment.id, { ...comment, replies: [] })
        })

        comments.forEach((comment) => {
            const commentWithReplies = commentMap.get(comment.id)
            if (!commentWithReplies) return

            if (comment.parent_comment_id === null) {
                rootComments.push(commentWithReplies)
            } else {
                if (comment.parent_comment_id !== null) {
                    const parent = commentMap.get(comment.parent_comment_id)
                    if (parent) {
                        parent.replies.push(commentWithReplies)
                    }
                }
            }
        })

        return NextResponse.json({
            comments: rootComments,
            count: comments.length,
        })
    } catch (error) {
        console.error('Error fetching comments:', error)
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await stackServerApp.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { recipe_id, parent_comment_id, content } = body

        // Validate
        if (!recipe_id || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        if (content.length > 2000) {
            return NextResponse.json(
                { error: 'Content exceeds 2000 characters' },
                { status: 400 }
            )
        }

        // Calculate depth
        let depth = 0
        if (parent_comment_id) {
            const parent = await db
                .select()
                .from(recipe_comments)
                .where(eq(recipe_comments.id, parent_comment_id))
                .limit(1)

            if (parent.length > 0) {
                depth = (parent[0].depth || 0) + 1
            }
        }

        // Max depth check
        if (depth > 5) {
            return NextResponse.json(
                { error: 'Maximum nesting depth reached' },
                { status: 400 }
            )
        }

        // Content moderation
        // Content moderation
        console.log('Moderating comment content:', content);
        const isFlagged = await moderateContent(content)
        console.log('Moderation result:', isFlagged);
        if (isFlagged) {
            return NextResponse.json(
                { error: 'Content flagged as inappropriate.' },
                { status: 400 }
            )
        }

        // Insert comment
        const [newComment] = await db
            .insert(recipe_comments)
            .values({
                recipe_id: parseInt(recipe_id),
                parent_comment_id: parent_comment_id || null,
                user_id: user.id,
                author_name: user.displayName || '--',
                content,
                depth,
            })
            .returning()

        return NextResponse.json(newComment, { status: 201 })
    } catch (error) {
        console.error('Error creating comment:', error)
        return NextResponse.json(
            { error: 'Failed to create comment' },
            { status: 500 }
        )
    }
}
