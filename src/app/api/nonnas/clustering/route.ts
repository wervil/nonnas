import { recipes } from "@/db/schema";
import {
  getCountryInfoWithFallback,
  getRegionCoordinates,
} from "@/lib/countryData";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

const db = drizzle(process.env.DATABASE_URL!);

export const dynamic = "force-dynamic";

type GlobeNonna = {
  id: string;
  lat: number;
  lng: number;
  countryCode: string;
  countryName: string;
  nonnaCount: number;
  representativeName: string;
  representativeTitle: string;
  representativePhoto: string | null;
  recipeId?: number;
  region?: string;
};

type RecipeLocationRow = {
  id: number;
  country: string;
  region: string | null;
  coordinates: string | null;
  firstName: string;
  lastName: string;
  grandmotherTitle: string;
  avatar_image: string | null;
  photo: string[] | null;
};

const publishedFilter = and(
  isNotNull(recipes.country),
  eq(recipes.published, true),
  isNull(recipes.deleted_at),
);

function parseCoordinates(
  coordString: string | null,
): { lat: number; lng: number } | null {
  if (!coordString) return null;

  const parts = coordString.split(",");
  if (parts.length !== 2) return null;

  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/** Identical to city-level markers: saved coordinates first, then region fallback. */
function getMarkerPosition(r: RecipeLocationRow): { lat: number; lng: number } {
  const countryInfo = getCountryInfoWithFallback(r.country);
  const stored = parseCoordinates(r.coordinates);
  if (stored) return stored;

  return getRegionCoordinates(
    r.region,
    countryInfo.code,
    countryInfo.lat,
    countryInfo.lng,
  );
}

function mapRecipeToMarker(r: RecipeLocationRow): GlobeNonna {
  const countryInfo = getCountryInfoWithFallback(r.country);
  const pos = getMarkerPosition(r);

  return {
    id: `nonna-${r.id}`,
    lat: pos.lat,
    lng: pos.lng,
    countryCode: countryInfo.code,
    countryName: r.country,
    nonnaCount: 1,
    representativeName: `${r.firstName} ${r.lastName}`,
    representativeTitle: r.grandmotherTitle,
    representativePhoto: r.avatar_image || r.photo?.[0] || null,
    recipeId: r.id,
    region: r.region || undefined,
  };
}

async function fetchRecipeLocations(countryFilter?: string | null) {
  const conditions = [publishedFilter];
  if (countryFilter) {
    conditions.push(
      eq(sql`lower(${recipes.country})`, countryFilter.toLowerCase()),
    );
  }

  return db
    .select({
      id: recipes.id,
      country: recipes.country,
      region: recipes.region,
      coordinates: recipes.coordinates,
      firstName: recipes.firstName,
      lastName: recipes.lastName,
      grandmotherTitle: recipes.grandmotherTitle,
      avatar_image: recipes.avatar_image,
      photo: recipes.photo,
    })
    .from(recipes)
    .where(and(...conditions));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || "NONNA";
    const countryParam = searchParams.get("country");

    const rows = await fetchRecipeLocations(countryParam);
    const clusters = rows.map(mapRecipeToMarker);

    // level=ALL kept for older clients — every layer uses the same exact markers
    if (level === "ALL") {
      return NextResponse.json(
        {
          clusters,
          continents: clusters,
          countries: clusters,
          states: clusters,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { clusters },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Clustering API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
