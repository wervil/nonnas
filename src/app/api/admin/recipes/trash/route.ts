import { recipes } from "@/db/schema";
import { stackServerApp } from "@/stack";
import { isNotNull, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const db = drizzle(process.env.DATABASE_URL!);

const SUPER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() ?? "";
const SUPER_ADMIN_SEC_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() ?? "";

/**
 * GET /api/admin/recipes/trash
 * Returns all soft-deleted recipes. Super admin only.
 */
export async function GET() {
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

    const trashed = await db
      .select({
        id: recipes.id,
        grandmotherTitle: recipes.grandmotherTitle,
        firstName: recipes.firstName,
        lastName: recipes.lastName,
        recipeTitle: recipes.recipeTitle,
        country: recipes.country,
        region: recipes.region,
        photo: recipes.photo,
        published: recipes.published,
        createdAt: recipes.createdAt,
        deleted_at: recipes.deleted_at,
        deleted_by: recipes.deleted_by,
      })
      .from(recipes)
      .where(isNotNull(recipes.deleted_at))
      .orderBy(desc(recipes.deleted_at));

    return NextResponse.json({ recipes: trashed });
  } catch (error) {
    console.error("Error fetching trash:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
