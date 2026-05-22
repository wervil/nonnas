import { recipes } from "@/db/schema";
import { geocodeCityToCoordinates } from "@/lib/geocode";
import { stackServerApp } from "@/stack";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const db = drizzle(process.env.DATABASE_URL!);

const SUPER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() ?? "";
const SUPER_ADMIN_SEC_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() ?? "";

const DELAY_MS = 120;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/admin/recipes/backfill-coordinates
 * Re-geocodes all published recipes that have city + country. Super admin only.
 */
export async function POST(_request: NextRequest) {
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

    const rows = await db
      .select({
        id: recipes.id,
        city: recipes.city,
        region: recipes.region,
        country: recipes.country,
        coordinates: recipes.coordinates,
      })
      .from(recipes)
      .where(
        and(
          isNull(recipes.deleted_at),
          isNotNull(recipes.city),
          isNotNull(recipes.country),
        ),
      );

    let updated = 0;
    let failed = 0;
    let unchanged = 0;

    for (const row of rows) {
      const city = row.city?.trim();
      const country = row.country?.trim();
      if (!city || !country) continue;

      const coordinates = await geocodeCityToCoordinates(
        city,
        row.region,
        country,
      );

      if (!coordinates) {
        failed++;
        await sleep(DELAY_MS);
        continue;
      }

      if (coordinates === row.coordinates) {
        unchanged++;
        await sleep(DELAY_MS);
        continue;
      }

      await db
        .update(recipes)
        .set({ coordinates })
        .where(and(isNull(recipes.deleted_at), eq(recipes.id, row.id)));

      updated++;
      await sleep(DELAY_MS);
    }

    return NextResponse.json({
      total: rows.length,
      updated,
      unchanged,
      failed,
    });
  } catch (error) {
    console.error("[backfill-coordinates]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
