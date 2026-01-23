
import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { conversations } from '@/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

const db = drizzle(process.env.DATABASE_URL!);

export async function GET(request: Request) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userConversations = await db
            .select()
            .from(conversations)
            .where(
                or(
                    eq(conversations.user1_id, user.id),
                    eq(conversations.user2_id, user.id)
                )
            )
            .orderBy(desc(conversations.updated_at));

        return NextResponse.json(userConversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const user = await stackServerApp.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { targetUserId } = await request.json();
        if (!targetUserId) return NextResponse.json({ error: 'Target User ID required' }, { status: 400 });

        // Validate self-chat
        if (user.id === targetUserId) {
            return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 });
        }

        const [u1, u2] = [user.id, targetUserId].sort();

        const existing = await db
            .select()
            .from(conversations)
            .where(and(
                eq(conversations.user1_id, u1),
                eq(conversations.user2_id, u2)
            ))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json(existing[0]);
        }

        const newConvo = await db.insert(conversations).values({
            user1_id: u1,
            user2_id: u2,
        }).returning();

        return NextResponse.json(newConvo[0]);
    } catch (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
