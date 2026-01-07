import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/neon-serverless";
import { recipes } from "@/db/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { getCountryInfoWithFallback } from "@/lib/countryData";

const db = drizzle(process.env.DATABASE_URL!);

export type NonnaCountByCountry = {
  id: string;
  lat: number;
  lng: number;
  continent: string;
  region?: string; // Sub-region for Asia breakdown
  countryCode: string;
  countryName: string;
  nonnaCount: number;
};

// Countries in each sub-region (for filtering)
const REGION_COUNTRIES: Record<string, string[]> = {
  "Middle East": [
    "Turkey", "Iran", "Iraq", "Saudi Arabia", "Yemen", "Syria", "Jordan",
    "United Arab Emirates", "Israel", "Lebanon", "Oman", "Kuwait", "Qatar",
    "Bahrain", "Cyprus", "Palestine",
  ],
  "South Asia": [
    "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan",
    "Maldives", "Afghanistan",
  ],
  "East Asia": [
    "China", "Japan", "South Korea", "North Korea", "Taiwan", "Mongolia",
  ],
  "Southeast Asia": [
    "Thailand", "Vietnam", "Indonesia", "Philippines", "Malaysia", "Singapore",
    "Myanmar", "Cambodia", "Laos", "Brunei", "Timor-Leste",
  ],
  "Central Asia": [
    "Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan",
  ],
  "Pacific Islands": [
    "Fiji", "Papua New Guinea", "Solomon Islands", "Vanuatu", "New Caledonia",
    "Samoa", "Tonga", "Micronesia", "Marshall Islands", "Palau", "Kiribati",
  ],
};

// Get the sub-region for a country
function getCountryRegion(countryName: string): string | undefined {
  for (const [region, countries] of Object.entries(REGION_COUNTRIES)) {
    if (countries.includes(countryName)) {
      return region;
    }
  }
  return undefined;
}

/**
 * GET /api/nonnas/globe
 * Returns all nonnas grouped by country with counts for the globe view
 * Query params:
 *   - continent: Filter by continent (optional)
 *   - region: Filter by sub-region like "Middle East", "South Asia", etc. (optional)
 *   - published: Filter by published status (optional, defaults to true)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const continentFilter = searchParams.get("continent");
    const regionFilter = searchParams.get("region");
    const publishedParam = searchParams.get("published");
    const published = publishedParam !== "false"; // Default to true

    // Get count of nonnas (recipes) grouped by country
    const conditions = [isNotNull(recipes.country)];
    
    if (published) {
      conditions.push(eq(recipes.published, true));
    }

    const countryStats = await db
      .select({
        country: recipes.country,
        count: sql<number>`count(*)::int`,
      })
      .from(recipes)
      .where(and(...conditions))
      .groupBy(recipes.country);

    // Transform to ClusterPoint format with continent info
    const clusterPoints: NonnaCountByCountry[] = [];

    for (const stat of countryStats) {
      if (!stat.country) continue;

      const countryInfo = getCountryInfoWithFallback(stat.country);
      const region = getCountryRegion(countryInfo.name);
      
      // Filter by region (sub-region) if specified
      if (regionFilter) {
        const regionCountries = REGION_COUNTRIES[regionFilter];
        if (regionCountries && !regionCountries.includes(countryInfo.name)) {
          continue;
        }
      }
      // Otherwise filter by continent if specified
      else if (continentFilter && countryInfo.continent !== continentFilter) {
        continue;
      }

      clusterPoints.push({
        id: `country-${countryInfo.code}`,
        lat: countryInfo.lat,
        lng: countryInfo.lng,
        continent: countryInfo.continent,
        region,
        countryCode: countryInfo.code,
        countryName: countryInfo.name,
        nonnaCount: stat.count,
      });
    }

    // Group by continent for summary
    const continentSummary: Record<string, number> = {};
    for (const point of clusterPoints) {
      if (!continentSummary[point.continent]) {
        continentSummary[point.continent] = 0;
      }
      continentSummary[point.continent] += point.nonnaCount;
    }

    // Group by region for summary (for Asia sub-regions)
    const regionSummary: Record<string, number> = {};
    for (const point of clusterPoints) {
      if (point.region) {
        if (!regionSummary[point.region]) {
          regionSummary[point.region] = 0;
        }
        regionSummary[point.region] += point.nonnaCount;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        countries: clusterPoints,
        continentSummary,
        regionSummary,
        totalNonnas: clusterPoints.reduce((sum, p) => sum + p.nonnaCount, 0),
      },
    });
  } catch (error) {
    console.error("Error fetching globe data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch globe data" },
      { status: 500 }
    );
  }
}

