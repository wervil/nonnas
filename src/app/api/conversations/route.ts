
import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { conversations } from '@/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';
import { stackServerApp } from '@/stack';

const db = drizzle(process.env.DATABASE_URL!);

export async function GET() {
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

        // Check for missing names and try to resolve them
        const missingUserIds = new Set<string>();
        // const convosToUpdate: { id: number, updates: any }[] = [];

        for (const convo of userConversations) {
            // Check user 1
            if (convo.user1_id !== user.id && (!convo.user1_name || convo.user1_name === convo.user1_id)) {
                missingUserIds.add(convo.user1_id);
            }
            // Check user 2
            if (convo.user2_id !== user.id && (!convo.user2_name || convo.user2_name === convo.user2_id)) {
                missingUserIds.add(convo.user2_id);
            }
        }

        if (missingUserIds.size > 0) {
            const ids = Array.from(missingUserIds);

            // Parallel lookups to find names from Stack Auth
            const stackUsers = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const user = await stackServerApp.getUser(id);
                        return user;
                    } catch (error) {
                        console.error(`Failed to fetch user ${id} from Stack:`, error);
                        return null;
                    }
                })
            );

            const nameMap = new Map<string, string>();
            stackUsers.forEach(u => {
                if (u && u.id && u.displayName) {
                    nameMap.set(u.id, u.displayName);
                }
            });

            // Apply updates
            for (const convo of userConversations) {
                const updates: any = {};
                if (convo.user1_id !== user.id && nameMap.has(convo.user1_id) && (!convo.user1_name || convo.user1_name === convo.user1_id)) {
                    updates.user1_name = nameMap.get(convo.user1_id);
                    convo.user1_name = updates.user1_name; // update in memory
                }
                if (convo.user2_id !== user.id && nameMap.has(convo.user2_id) && (!convo.user2_name || convo.user2_name === convo.user2_id)) {
                    updates.user2_name = nameMap.get(convo.user2_id);
                    convo.user2_name = updates.user2_name; // update in memory
                }

                if (Object.keys(updates).length > 0) {
                    await db.update(conversations).set(updates).where(eq(conversations.id, convo.id));
                }
            }
        }

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
        const { targetUserId, targetUserName } = await request.json();
        if (!targetUserId) return NextResponse.json({ error: 'Target User ID required' }, { status: 400 });

        // Validate self-chat
        if (user.id === targetUserId) {
            return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 });
        }

        const currentUserName = user.displayName || user.id; // Keep fallback for current user as we know it's us
        const otherUserName = targetUserName || null; // Don't fallback to ID for other user

        // Determine who is u1 and u2 based on ID sort
        const isUser1CurrentUser = user.id < targetUserId;
        const [u1, u2] = isUser1CurrentUser ? [user.id, targetUserId] : [targetUserId, user.id];

        // Careful with name assignment
        const u1Name = isUser1CurrentUser ? currentUserName : otherUserName;
        const u2Name = isUser1CurrentUser ? otherUserName : currentUserName;

        const existing = await db
            .select()
            .from(conversations)
            .where(and(
                eq(conversations.user1_id, u1),
                eq(conversations.user2_id, u2)
            ))
            .limit(1);

        if (existing.length > 0) {
            // Update names if missing or if it looks like an ID (bad data)
            const convo = existing[0];
            const updates: any = {};

            // If we have a valid new name (that isn't just the ID), and the current db name is invalid (null or equals id), update it.
            if (u1Name && u1Name !== u1 && (!convo.user1_name || convo.user1_name === u1)) {
                updates.user1_name = u1Name;
            }
            if (u2Name && u2Name !== u2 && (!convo.user2_name || convo.user2_name === u2)) {
                updates.user2_name = u2Name;
            }

            if (Object.keys(updates).length > 0) {
                const [updated] = await db.update(conversations)
                    .set(updates)
                    .where(eq(conversations.id, convo.id))
                    .returning();
                return NextResponse.json(updated);
            }
            return NextResponse.json(convo);
        }

        const newConvo = await db.insert(conversations).values({
            user1_id: u1,
            user1_name: u1Name,
            user2_id: u2,
            user2_name: u2Name,
        }).returning();

        return NextResponse.json(newConvo[0]);
    } catch (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
