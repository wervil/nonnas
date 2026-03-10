import { recipes } from "@/db/schema";
import {
  getCountryInfoWithFallback,
  getRegionCoordinates,
} from "@/lib/countryData";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { NextRequest, NextResponse } from "next/server";

const db = drizzle(process.env.DATABASE_URL_DEV!);

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
  region?: string;
  clusterLevel?: "continent" | "country" | "state" | "nonna";
};

// A deterministic random function based on a string seed
function seedRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (Math.imul(31, hash) + seedStr.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

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

const continentCoords: Record<string, { lat: number; lng: number }> = {
  Africa: { lat: 9, lng: 20 },
  Asia: { lat: 34, lng: 100 },
  Europe: { lat: 54, lng: 15 },
  "North America": { lat: 40, lng: -100 },
  "South America": { lat: -15, lng: -60 },
  Oceania: { lat: -25, lng: 140 },
  Unknown: { lat: 0, lng: 0 },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || "EARTH"; // EARTH, CONTINENT, COUNTRY, STATE, CITY, NONNA, ALL
    const countryParam = searchParams.get("country");

    // ─────────────────────────────────────────────────────────────────────────
    // ALL: Single DB query that returns continent + country + state clusters
    // ─────────────────────────────────────────────────────────────────────────
    if (level === "ALL") {
      const allRows = await db
        .select({
          country: recipes.country,
          region: recipes.region,
          coordinates: sql<string>`MAX(${recipes.coordinates})`,
          count: sql<number>`count(*)`,
          repName: sql<string>`MAX(${recipes.firstName} || ' ' || ${recipes.lastName})`,
          repTitle: sql<string>`MAX(${recipes.grandmotherTitle})`,
          repPhoto: sql<string>`MAX(coalesce(${recipes.avatar_image}, ${recipes.photo}[1]))`,
        })
        .from(recipes)
        .where(isNotNull(recipes.country))
        .groupBy(recipes.country, recipes.region);

      const continentMap: Record<string, GlobeNonna> = {};
      const countryMap: Record<string, GlobeNonna> = {};
      const stateClusters: GlobeNonna[] = [];

      allRows.forEach((r, i) => {
        const countryInfo = getCountryInfoWithFallback(r.country);
        const continent = countryInfo.continent;
        const regionName = r.region || "Unknown Region";
        const count = Number(r.count);

        // Parse coordinates from database, fallback to country/region logic
        const dbCoords = parseCoordinates(r.coordinates);
        let useCoords: { lat: number; lng: number };

        if (dbCoords) {
          useCoords = dbCoords;
        } else {
          useCoords = { lat: countryInfo.lat, lng: countryInfo.lng };
        }

        // Continent layer
        if (!continentMap[continent]) {
          const coords =
            continentCoords[continent] || continentCoords["Unknown"];
          continentMap[continent] = {
            id: `continent-${continent}`,
            lat: coords.lat,
            lng: coords.lng,
            countryCode: "XX",
            countryName: continent,
            nonnaCount: 0,
            representativeName: r.repName,
            representativeTitle: r.repTitle,
            representativePhoto: r.repPhoto || null,
            clusterLevel: "continent",
          };
        }
        continentMap[continent].nonnaCount += count;

        // Country layer
        if (!countryMap[r.country]) {
          countryMap[r.country] = {
            id: `country-${i}`,
            lat: useCoords.lat,
            lng: useCoords.lng,
            countryCode: countryInfo.code,
            countryName: r.country,
            nonnaCount: 0,
            representativeName: r.repName,
            representativeTitle: r.repTitle,
            representativePhoto: r.repPhoto || null,
            clusterLevel: "country",
          };
        }
        countryMap[r.country].nonnaCount += count;

        // State/region layer - use region coordinates logic for better granularity
        const regionCoords = getRegionCoordinates(
          regionName,
          countryInfo.code,
          useCoords.lat,
          useCoords.lng,
        );
        stateClusters.push({
          id: `region-${i}`,
          lat: regionCoords.lat,
          lng: regionCoords.lng,
          countryCode: countryInfo.code,
          countryName: regionName,
          nonnaCount: count,
          representativeName: r.repName,
          representativeTitle: r.repTitle,
          representativePhoto: r.repPhoto || null,
          region: regionName,
          clusterLevel: "state",
        });
      });

      return NextResponse.json({
        continents: Object.values(continentMap),
        countries: Object.values(countryMap),
        states: stateClusters,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Legacy single-level endpoints
    // ─────────────────────────────────────────────────────────────────────────
    let clusters: GlobeNonna[] = [];

    if (level === "EARTH") {
      const rows = await db
        .select({
          country: recipes.country,
          count: sql<number>`count(*)`,
          repName: sql<string>`MAX(${recipes.firstName} || ' ' || ${recipes.lastName})`,
          repTitle: sql<string>`MAX(${recipes.grandmotherTitle})`,
          repPhoto: sql<string>`MAX(coalesce(${recipes.avatar_image}, ${recipes.photo}[1]))`,
        })
        .from(recipes)
        .where(isNotNull(recipes.country))
        .groupBy(recipes.country);

      const continentMap: Record<string, GlobeNonna> = {};
      rows.forEach((r) => {
        const countryInfo = getCountryInfoWithFallback(r.country);
        const continent = countryInfo.continent;
        if (!continentMap[continent]) {
          const coords =
            continentCoords[continent] || continentCoords["Unknown"];
          continentMap[continent] = {
            id: `continent-${continent}`,
            lat: coords.lat,
            lng: coords.lng,
            countryCode: "XX",
            countryName: continent,
            nonnaCount: 0,
            representativeName: r.repName,
            representativeTitle: r.repTitle,
            representativePhoto: r.repPhoto || null,
          };
        }
        continentMap[continent].nonnaCount += Number(r.count);
      });
      clusters = Object.values(continentMap);
    } else if (level === "CONTINENT") {
      const rows = await db
        .select({
          country: recipes.country,
          count: sql<number>`count(*)`,
          repName: sql<string>`MAX(${recipes.firstName} || ' ' || ${recipes.lastName})`,
          repTitle: sql<string>`MAX(${recipes.grandmotherTitle})`,
          repPhoto: sql<string>`MAX(coalesce(${recipes.avatar_image}, ${recipes.photo}[1]))`,
        })
        .from(recipes)
        .where(isNotNull(recipes.country))
        .groupBy(recipes.country);

      clusters = rows.map((r, i) => {
        const countryInfo = getCountryInfoWithFallback(r.country);
        return {
          id: `country-${i}`,
          lat: countryInfo.lat,
          lng: countryInfo.lng,
          countryCode: countryInfo.code,
          countryName: r.country,
          nonnaCount: Number(r.count),
          representativeName: r.repName,
          representativeTitle: r.repTitle,
          representativePhoto: r.repPhoto || null,
        };
      });
    } else if (level === "COUNTRY" || level === "STATE") {
      const conditions = [];
      if (countryParam) {
        conditions.push(
          eq(sql`lower(${recipes.country})`, countryParam.toLowerCase()),
        );
      } else {
        conditions.push(isNotNull(recipes.country));
      }

      const rows = await db
        .select({
          country: recipes.country,
          region: recipes.region,
          coordinates: sql<string>`MAX(${recipes.coordinates})`,
          count: sql<number>`count(*)`,
          repName: sql<string>`MAX(${recipes.firstName} || ' ' || ${recipes.lastName})`,
          repTitle: sql<string>`MAX(${recipes.grandmotherTitle})`,
          repPhoto: sql<string>`MAX(coalesce(${recipes.avatar_image}, ${recipes.photo}[1]))`,
        })
        .from(recipes)
        .where(and(...conditions))
        .groupBy(recipes.country, recipes.region);

      clusters = rows.map((r, i) => {
        const countryInfo = getCountryInfoWithFallback(r.country);
        const regionName = r.region || "Unknown Region";

        // Parse coordinates from database first
        const dbCoords = parseCoordinates(r.coordinates);
        let baseCoords: { lat: number; lng: number };

        if (dbCoords) {
          baseCoords = dbCoords;
        } else {
          // Fallback to region coordinates
          baseCoords = getRegionCoordinates(
            regionName,
            countryInfo.code,
            countryInfo.lat,
            countryInfo.lng,
          );
        }

        return {
          id: `region-${i}`,
          lat: baseCoords.lat,
          lng: baseCoords.lng,
          countryCode: countryInfo.code,
          countryName: regionName,
          nonnaCount: Number(r.count),
          representativeName: r.repName,
          representativeTitle: r.repTitle,
          representativePhoto: r.repPhoto || null,
          region: regionName,
        };
      });
    } else {
      // CITY or NONNA level: show individual Nonnas
      const conditions = [];
      if (countryParam) {
        conditions.push(
          eq(sql`lower(${recipes.country})`, countryParam.toLowerCase()),
        );
      }

      const rows = await db
        .select()
        .from(recipes)
        .where(conditions.length ? and(...conditions) : undefined);

      clusters = rows.map((r) => {
        const countryInfo = getCountryInfoWithFallback(r.country);
        const nonnaName = `${r.firstName} ${r.lastName}`;

        // Parse coordinates from database first
        const dbCoords = parseCoordinates(r.coordinates);
        let baseCoords: { lat: number; lng: number };
        let useExactCoords = false;

        if (dbCoords) {
          baseCoords = dbCoords;
          useExactCoords = true;
        } else {
          // Fallback to region coordinates
          baseCoords = getRegionCoordinates(
            r.region,
            countryInfo.code,
            countryInfo.lat,
            countryInfo.lng,
          );
        }

        // Add small random offset for visual separation ONLY when using fallback coordinates
        let finalLat = baseCoords.lat;
        let finalLng = baseCoords.lng;

        if (!useExactCoords) {
          const randLat = (seedRandom(r.id + nonnaName + "lat") - 0.5) * 1.5;
          const randLng = (seedRandom(r.id + nonnaName + "lng") - 0.5) * 1.5;
          finalLat += randLat;
          finalLng += randLng;
        }

        return {
          id: `nonna-${r.id}`,
          lat: finalLat,
          lng: finalLng,
          countryCode: countryInfo.code,
          countryName: r.country,
          nonnaCount: 1,
          representativeName: nonnaName,
          representativeTitle: r.grandmotherTitle,
          representativePhoto: r.avatar_image || r.photo?.[0] || null,
          region: r.region || undefined,
        };
      });
    }

    return NextResponse.json({ clusters });
  } catch (error) {
    console.error("Clustering API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
