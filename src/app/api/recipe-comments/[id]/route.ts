import { NextRequest, NextResponse } from "next/server";

import { recipe_comments } from "@/db/schema";
import { getCurrentUserWithSuperAdmin } from "@/lib/super-admin";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

const db = drizzle(process.env.DATABASE_URL!);

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const { user_id, content } = body;
    const commentId = parseInt(params.id);

    // Fetch existing comment
    const [existing] = await db
      .select()
      .from(recipe_comments)
      .where(eq(recipe_comments.id, commentId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Check ownership
    if (existing.user_id !== user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update
    const [updated] = await db
      .update(recipe_comments)
      .set({ content, updated_at: new Date() })
      .where(eq(recipe_comments.id, commentId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const commentId = parseInt(params.id);

    if (isNaN(commentId)) {
      return NextResponse.json(
        { error: "Invalid comment ID" },
        { status: 400 },
      );
    }

    // Authenticate caller via Stack (server-trusted identity)
    const { user, isSuperAdmin } = await getCurrentUserWithSuperAdmin();

    // Backward compatibility: also accept ?user_id= for callers that still
    // identify themselves via a query string (existing client behavior).
    const queryUserId = request.nextUrl.searchParams.get("user_id");
    const requesterId = user?.id ?? queryUserId ?? null;

    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing comment
    const [existing] = await db
      .select()
      .from(recipe_comments)
      .where(eq(recipe_comments.id, commentId))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Super Admin can delete any comment. Otherwise enforce ownership.
    const isOwner = existing.user_id === requesterId;
    if (!isSuperAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete (cascade will handle replies)
    await db.delete(recipe_comments).where(eq(recipe_comments.id, commentId));

    return NextResponse.json({
      success: true,
      deleted_by_super_admin: isSuperAdmin && !isOwner,
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 },
    );
  }
}
