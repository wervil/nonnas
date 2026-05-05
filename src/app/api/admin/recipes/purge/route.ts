import { recipes } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { and, inArray, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const db = drizzle(process.env.DATABASE_URL!);

const SUPER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() ?? "";
const SUPER_ADMIN_SEC_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() ?? "";

/**
 * DELETE /api/admin/recipes/purge
 * Body: { ids: number[] }
 * Permanently hard-deletes one or more soft-deleted recipes. Super admin only.
 * Only rows that are already soft-deleted can be purged this way.
 */
export async function DELETE(request: NextRequest) {
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

    // Only purge rows that are already soft-deleted — prevents accidental purge of live recipes
    const purged = await db
      .delete(recipes)
      .where(and(inArray(recipes.id, numericIds), isNotNull(recipes.deleted_at)))
      .returning({ id: recipes.id });

    return NextResponse.json({
      message: `${purged.length} recipe(s) permanently deleted`,
      purgedIds: purged.map((r) => r.id),
    });
  } catch (error) {
    console.error("Error purging recipes:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
