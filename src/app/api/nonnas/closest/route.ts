import { recipes } from "@/db/schema";
import {
  CountryInfo,
  getCountriesByContinent,
  getCountryInfoWithFallback,
  getRegionCoordinates,
} from "@/lib/countryData";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

const db = drizzle(process.env.DATABASE_URL!);

// Helper function to parse coordinates from database string "lat,lng"
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

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clusterLevel = searchParams.get("level"); // "continent", "country", "state"
    const clusterName = searchParams.get("name"); // e.g., "Asia", "Italy", "California"
    const countryCode = searchParams.get("countryCode"); // Optional, for state level

    if (!clusterLevel || !clusterName) {
      return NextResponse.json(
        { error: "Missing required parameters: level and name" },
        { status: 400 },
      );
    }

    const whereConditions = [isNotNull(recipes.country), isNull(recipes.deleted_at)];

    if (clusterLevel === "continent") {
      // Get all countries that belong to this continent
      const continentCountries = getCountriesByContinent(clusterName);

      if (continentCountries.length === 0) {
        return NextResponse.json({ closestNonna: null });
      }

      // Create a raw SQL query for the continent filter with proper escaping
      const countryList = continentCountries
        .map((c: CountryInfo) => `'${c.name.replace(/'/g, "''")}'`)
        .join(",");
      whereConditions.push(sql.raw(`recipes.country IN (${countryList})`));
    } else if (clusterLevel === "country") {
      whereConditions.push(eq(recipes.country, clusterName));
    } else if (clusterLevel === "state") {
      whereConditions.push(eq(recipes.region, clusterName));
      if (countryCode) {
        // Filter by country code for state level to avoid conflicts
        const countryInfo = getCountryInfoWithFallback(clusterName); // Use clusterName as fallback
        if (countryInfo.code === countryCode.toUpperCase()) {
          whereConditions.push(eq(recipes.country, countryInfo.name));
        }
      }
    } else {
      return NextResponse.json(
        { error: "Invalid level. Must be: continent, country, or state" },
        { status: 400 },
      );
    }

    // Get all nonnas in the cluster
    const nonnas = await db
      .select()
      .from(recipes)
      .where(and(...whereConditions));

    if (nonnas.length === 0) {
      return NextResponse.json({ closestNonna: null });
    }

    // If only one nonna, return it directly
    if (nonnas.length === 1) {
      const nonna = nonnas[0];
      const countryInfo = getCountryInfoWithFallback(nonna.country);
      const dbCoords = parseCoordinates(nonna.coordinates);

      return NextResponse.json({
        closestNonna: {
          id: `nonna-${nonna.id}`,
          lat: dbCoords?.lat || countryInfo.lat,
          lng: dbCoords?.lng || countryInfo.lng,
          countryCode: countryInfo.code,
          countryName: nonna.country,
          nonnaCount: 1,
          representativeName: `${nonna.firstName} ${nonna.lastName}`,
          representativeTitle: nonna.grandmotherTitle,
          representativePhoto: nonna.avatar_image || nonna.photo?.[0] || null,
          recipeId: nonna.id,
          region: nonna.region || undefined,
        },
      });
    }

    // For multiple nonnas, find the one closest to the cluster center
    let clusterCenterLat: number;
    let clusterCenterLng: number;

    if (clusterLevel === "continent") {
      // Use predefined continent coordinates
      const continentCoords: Record<string, { lat: number; lng: number }> = {
        Africa: { lat: 9, lng: 20 },
        Asia: { lat: 34, lng: 100 },
        Europe: { lat: 54, lng: 15 },
        "North America": { lat: 40, lng: -100 },
        "South America": { lat: -15, lng: -60 },
        Oceania: { lat: -25, lng: 140 },
      };
      const coords = continentCoords[clusterName] || { lat: 0, lng: 0 };
      clusterCenterLat = coords.lat;
      clusterCenterLng = coords.lng;
    } else if (clusterLevel === "country") {
      const countryInfo = getCountryInfoWithFallback(clusterName);
      clusterCenterLat = countryInfo.lat;
      clusterCenterLng = countryInfo.lng;
    } else if (clusterLevel === "state") {
      // For state, calculate the average of all nonnas in that state
      const validCoords = nonnas
        .map((nonna) => parseCoordinates(nonna.coordinates))
        .filter(Boolean) as { lat: number; lng: number }[];

      if (validCoords.length > 0) {
        clusterCenterLat =
          validCoords.reduce((sum, coord) => sum + coord.lat, 0) /
          validCoords.length;
        clusterCenterLng =
          validCoords.reduce((sum, coord) => sum + coord.lng, 0) /
          validCoords.length;
      } else {
        // Fallback to first nonna's country coordinates
        const countryInfo = getCountryInfoWithFallback(nonnas[0].country);
        clusterCenterLat = countryInfo.lat;
        clusterCenterLng = countryInfo.lng;
      }
    } else {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    // Find the closest nonna to the cluster center
    let closestNonna = nonnas[0];
    let minDistance = Infinity;

    for (const nonna of nonnas) {
      const countryInfo = getCountryInfoWithFallback(nonna.country);
      const dbCoords = parseCoordinates(nonna.coordinates);

      // Use exact coordinates if available, otherwise use region coordinates for better accuracy
      let nonnaLat: number;
      let nonnaLng: number;

      if (dbCoords) {
        nonnaLat = dbCoords.lat;
        nonnaLng = dbCoords.lng;
      } else {
        // Use region coordinates as fallback - much more accurate than country center
        const regionCoords = getRegionCoordinates(
          nonna.region || "Unknown Region",
          countryInfo.code,
          countryInfo.lat,
          countryInfo.lng,
        );
        nonnaLat = regionCoords.lat;
        nonnaLng = regionCoords.lng;
      }

      const distance = calculateDistance(
        clusterCenterLat,
        clusterCenterLng,
        nonnaLat,
        nonnaLng,
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestNonna = nonna;
      }
    }

    const countryInfo = getCountryInfoWithFallback(closestNonna.country);
    const dbCoords = parseCoordinates(closestNonna.coordinates);

    // Use exact coordinates if available, otherwise use region coordinates for better accuracy
    let finalLat: number;
    let finalLng: number;

    if (dbCoords) {
      finalLat = dbCoords.lat;
      finalLng = dbCoords.lng;
    } else {
      // Use region coordinates as fallback - much more accurate than country center
      const regionCoords = getRegionCoordinates(
        closestNonna.region || "Unknown Region",
        countryInfo.code,
        countryInfo.lat,
        countryInfo.lng,
      );
      finalLat = regionCoords.lat;
      finalLng = regionCoords.lng;
    }

    return NextResponse.json({
      closestNonna: {
        id: `nonna-${closestNonna.id}`,
        lat: finalLat,
        lng: finalLng,
        countryCode: countryInfo.code,
        countryName: closestNonna.country,
        nonnaCount: 1,
        representativeName: `${closestNonna.firstName} ${closestNonna.lastName}`,
        representativeTitle: closestNonna.grandmotherTitle,
        representativePhoto:
          closestNonna.avatar_image || closestNonna.photo?.[0] || null,
        recipeId: closestNonna.id,
        region: closestNonna.region || undefined,
      },
    });
  } catch (error) {
    console.error("Closest nonna API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
