
import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { conversations, messages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

const db = drizzle(process.env.DATABASE_URL!);

export async function POST(request: Request) {
    const user = await stackServerApp.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { conversation_id, content, attachment_url, attachment_type } = body;

        if (!conversation_id) {
            return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
        }

        if (!content && !attachment_url) {
            return NextResponse.json({ error: 'Message must have content or attachment' }, { status: 400 });
        }

        // Verify membership
        const [convo] = await db
            .select()
            .from(conversations)
            .where(eq(conversations.id, conversation_id))
            .limit(1);

        if (!convo) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        if (convo.user1_id !== user.id && convo.user2_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create message
        const [newMsg] = await db.insert(messages).values({
            conversation_id,
            sender_id: user.id,
            content: content || null,
            attachment_url: attachment_url || null,
            attachment_type: attachment_type || null,
        }).returning();

        // Update conversation timestamp
        await db
            .update(conversations)
            .set({ updated_at: new Date() })
            .where(eq(conversations.id, conversation_id));

        return NextResponse.json(newMsg);
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
