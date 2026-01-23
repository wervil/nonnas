
import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { conversations, messages } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

const db = drizzle(process.env.DATABASE_URL!);

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const conversationId = parseInt(id);
        if (isNaN(conversationId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Verify membership
        const [convo] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversationId))
            .limit(1);

        if (!convo) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (convo.user1_id !== user.id && convo.user2_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch messages
        const msgs = await db
            .select()
            .from(messages)
            .where(eq(messages.conversation_id, conversationId))
            .orderBy(asc(messages.created_at));

        return NextResponse.json(msgs);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
