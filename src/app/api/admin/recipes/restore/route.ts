import { recipes } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const db = drizzle(process.env.DATABASE_URL!);

const SUPER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() ?? "";
const SUPER_ADMIN_SEC_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() ?? "";

/**
 * POST /api/admin/recipes/restore
 * Body: { ids: number[] }
 * Restores (un-deletes) one or more soft-deleted recipes. Super admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const email = user.primaryEmail?.toLowerCase() ?? "";
    const isSuperAdmin =
      email === SUPER_ADMIN_EMAIL || email === SUPER_ADMIN_SEC_EMAIL;

    if (!isSuperAdmin) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const ids: unknown = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: "ids must be a non-empty array" },
        { status: 400 },
      );
    }

    const numericIds = ids.map(Number).filter((n) => !isNaN(n));
    if (numericIds.length === 0) {
      return NextResponse.json(
        { message: "No valid IDs provided" },
        { status: 400 },
      );
    }

    // Always restore as unpublished — admin must manually re-publish after reviewing
    const restored = await db
      .update(recipes)
      .set({ deleted_at: null, deleted_by: null, published: false })
      .where(inArray(recipes.id, numericIds))
      .returning({ id: recipes.id });

    return NextResponse.json({
      message: `${restored.length} recipe(s) restored successfully`,
      restoredIds: restored.map((r) => r.id),
    });
  } catch (error) {
    console.error("Error restoring recipes:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
