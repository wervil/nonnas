import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/neon-serverless";
import { recipes } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { getCountryInfoWithFallback } from "@/lib/countryData";

const db = drizzle(process.env.DATABASE_URL!);

export type NonnaNonnaDetail = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  grandmotherTitle: string;
  recipeTitle: string;
  country: string;
  region: string | null;
  photo: string[] | null;
  recipeImage: string[] | null;
  dishImage: string[] | null;
  history: string;
  traditions: string | null;
};

/**
 * GET /api/nonnas/state
 * Returns detailed nonna information for a specific country and state/region
 * Query params:
 *   - country: Country code or name (required)
 *   - state: State/region name (required)
 *   - published: Filter by published status (optional, defaults to true)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const state = searchParams.get("state");
    const publishedParam = searchParams.get("published");
    const published = publishedParam !== "false";

    if (!country || !state) {
      return NextResponse.json(
        { success: false, error: "Country and state parameters are required" },
        { status: 400 }
      );
    }

    const countryInfo = getCountryInfoWithFallback(country);

    // Build conditions
    const conditions = [];

    if (published) {
      conditions.push(eq(recipes.published, true));
    }

    // Match country
    conditions.push(
      or(
        ilike(recipes.country, countryInfo.name),
        ilike(recipes.country, `%${countryInfo.name}%`),
        ilike(recipes.country, country)
      )!
    );

    // Match state/region
    if (state.toLowerCase() !== "unknown region") {
      conditions.push(ilike(recipes.region, state));
    }

    const nonnas = await db
      .select({
        id: recipes.id,
        firstName: recipes.firstName,
        lastName: recipes.lastName,
        grandmotherTitle: recipes.grandmotherTitle,
        recipeTitle: recipes.recipeTitle,
        country: recipes.country,
        region: recipes.region,
        photo: recipes.photo,
        recipe_image: recipes.recipe_image,
        dish_image: recipes.dish_image,
        history: recipes.history,
        traditions: recipes.traditions,
      })
      .from(recipes)
      .where(and(...conditions));

    const formattedNonnas: NonnaNonnaDetail[] = nonnas.map((nonna) => ({
      id: nonna.id,
      name: `${nonna.grandmotherTitle} ${nonna.firstName} ${nonna.lastName}`.trim(),
      firstName: nonna.firstName,
      lastName: nonna.lastName,
      grandmotherTitle: nonna.grandmotherTitle,
      recipeTitle: nonna.recipeTitle,
      country: nonna.country,
      region: nonna.region,
      photo: nonna.photo,
      recipeImage: nonna.recipe_image,
      dishImage: nonna.dish_image,
      history: nonna.history,
      traditions: nonna.traditions,
    }));

    return NextResponse.json({
      success: true,
      data: {
        country: countryInfo.name,
        countryCode: countryInfo.code,
        state,
        nonnas: formattedNonnas,
        count: formattedNonnas.length,
      },
    });
  } catch (error) {
    console.error("Error fetching state nonnas:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch state data" },
      { status: 500 }
    );
  }
}

