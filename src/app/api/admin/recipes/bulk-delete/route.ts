import { recipes } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { checkAdminPermission } from "@/utils/checkAdminPermission";
import { and, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const db = drizzle(process.env.DATABASE_URL!);

/**
 * POST /api/admin/recipes/bulk-delete
 * Body: { ids: number[] }
 * Soft-deletes multiple recipes in one call. Requires admin permission.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkAdminPermission(user);
    if (!isAdmin) {
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

    const deletedByEmail = user.primaryEmail ?? "unknown";
    const now = new Date();

    const softDeleted = await db
      .update(recipes)
      .set({ deleted_at: now, deleted_by: deletedByEmail, published: false })
      .where(and(inArray(recipes.id, numericIds), isNull(recipes.deleted_at)))
      .returning({ id: recipes.id });

    return NextResponse.json({
      message: `${softDeleted.length} recipe(s) deleted successfully`,
      deletedIds: softDeleted.map((r) => r.id),
    });
  } catch (error) {
    console.error("Error bulk-deleting recipes:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
