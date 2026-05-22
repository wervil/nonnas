import { geocodeCityToCoordinates } from "@/lib/geocode";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/geocode?city=Messina&region=Sicily&country=Italy
 * Returns Google-geocoded coordinates for the recipe form.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const region = searchParams.get("region")?.trim() || null;
  const country = searchParams.get("country")?.trim();

  if (!city || !country) {
    return NextResponse.json(
      { message: "city and country are required" },
      { status: 400 },
    );
  }

  const countryIso = searchParams.get("countryIso")?.trim() || undefined;
  const coordinates = await geocodeCityToCoordinates(
    city,
    region,
    country,
    countryIso,
  );

  if (!coordinates) {
    return NextResponse.json(
      { message: "Could not geocode location" },
      { status: 404 },
    );
  }

  return NextResponse.json({ coordinates });
}
