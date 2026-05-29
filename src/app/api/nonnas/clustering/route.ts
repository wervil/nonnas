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

export type GlobeNonna = {
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
  city?: string;
  clusterLevel?: "continent" | "country" | "state" | "city" | "nonna";
};

const continentCoords: Record<string, { lat: number; lng: number }> = {
  Africa: { lat: 9, lng: 20 },
  Asia: { lat: 34, lng: 100 },
  Europe: { lat: 54, lng: 15 },
  "North America": { lat: 40, lng: -100 },
  "South America": { lat: -15, lng: -60 },
  Oceania: { lat: -25, lng: 140 },
  Unknown: { lat: 0, lng: 0 },
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

function seedRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (Math.imul(31, hash) + seedStr.charCodeAt(i)) | 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

type GroupRow = {
  country: string;
  region: string | null;
  city: string | null;
  coordinates: string | null;
  count: number;
  repName: string;
  repTitle: string;
  repPhoto: string | null;
  sampleRecipeId: number;
};

function resolveGroupCoords(
  row: GroupRow,
  countryInfo: ReturnType<typeof getCountryInfoWithFallback>,
): { lat: number; lng: number } {
  const dbCoords = parseCoordinates(row.coordinates);
  if (dbCoords) return dbCoords;

  return getRegionCoordinates(
    row.region,
    countryInfo.code,
    countryInfo.lat,
    countryInfo.lng,
  );
}

/** Build continent / country / state / city cluster layers from grouped SQL rows. */
function buildClusterLayers(rows: GroupRow[]) {
  const continentMap: Record<string, GlobeNonna> = {};
  const countryMap: Record<string, GlobeNonna> = {};
  const stateClusters: GlobeNonna[] = [];
  const cityMap: Record<string, GlobeNonna> = {};

  rows.forEach((r, i) => {
    const countryInfo = getCountryInfoWithFallback(r.country);
    const continent = countryInfo.continent;
    const regionName = r.region || "Unknown Region";
    const count = Number(r.count);
    const useCoords = resolveGroupCoords(r, countryInfo);

    if (!continentMap[continent]) {
      const coords = continentCoords[continent] || continentCoords.Unknown;
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
        recipeId: r.sampleRecipeId,
        clusterLevel: "continent",
      };
    }
    continentMap[continent].nonnaCount += count;

    if (!countryMap[r.country]) {
      countryMap[r.country] = {
        id: `country-${countryInfo.code}`,
        lat: useCoords.lat,
        lng: useCoords.lng,
        countryCode: countryInfo.code,
        countryName: r.country,
        nonnaCount: 0,
        representativeName: r.repName,
        representativeTitle: r.repTitle,
        representativePhoto: r.repPhoto || null,
        recipeId: r.sampleRecipeId,
        clusterLevel: "country",
      };
    }
    countryMap[r.country].nonnaCount += count;

    const regionCoords = getRegionCoordinates(
      regionName,
      countryInfo.code,
      useCoords.lat,
      useCoords.lng,
    );
    const stateCoords =
      count === 1 && parseCoordinates(r.coordinates) ? useCoords : regionCoords;

    stateClusters.push({
      id: `region-${i}-${regionName}`,
      lat: stateCoords.lat,
      lng: stateCoords.lng,
      countryCode: countryInfo.code,
      countryName: r.country,
      nonnaCount: count,
      representativeName: r.repName,
      representativeTitle: r.repTitle,
      representativePhoto: r.repPhoto || null,
      recipeId: r.sampleRecipeId,
      region: regionName,
      clusterLevel: "state",
    });

    const cityName = r.city?.trim();
    if (cityName) {
      const cityKey = `${r.country}|${regionName}|${cityName}`;
      if (!cityMap[cityKey]) {
        cityMap[cityKey] = {
          id: `city-${i}-${cityKey}`,
          lat: useCoords.lat,
          lng: useCoords.lng,
          countryCode: countryInfo.code,
          countryName: r.country,
          nonnaCount: 0,
          representativeName: r.repName,
          representativeTitle: r.repTitle,
          representativePhoto: r.repPhoto || null,
          recipeId: r.sampleRecipeId,
          region: regionName,
          city: cityName,
          clusterLevel: "city",
        };
      }
      const cityCluster = cityMap[cityKey];
      const prevCount = cityCluster.nonnaCount;
      cityCluster.nonnaCount += count;
      cityCluster.lat =
        (cityCluster.lat * prevCount + useCoords.lat * count) /
        (prevCount + count);
      cityCluster.lng =
        (cityCluster.lng * prevCount + useCoords.lng * count) /
        (prevCount + count);
    }
  });

  return {
    continents: Object.values(continentMap),
    countries: Object.values(countryMap),
    states: stateClusters,
    cities: Object.values(cityMap),
  };
}

async function fetchGroupedRows(countryFilter?: string | null) {
  const conditions = [publishedFilter];
  if (countryFilter) {
    conditions.push(
      eq(sql`lower(${recipes.country})`, countryFilter.toLowerCase()),
    );
  }

  return db
    .select({
      country: recipes.country,
      region: recipes.region,
      city: recipes.city,
      coordinates: sql<string>`MAX(${recipes.coordinates})`,
      count: sql<number>`count(*)::int`,
      repName: sql<string>`MAX(${recipes.firstName} || ' ' || ${recipes.lastName})`,
      repTitle: sql<string>`MAX(${recipes.grandmotherTitle})`,
      repPhoto: sql<string>`MAX(coalesce(${recipes.avatar_image}, ${recipes.photo}[1]))`,
      sampleRecipeId: sql<number>`MAX(${recipes.id})`,
    })
    .from(recipes)
    .where(and(...conditions))
    .groupBy(recipes.country, recipes.region, recipes.city);
}

async function fetchIndividualMarkers(
  countryFilter?: string | null,
  cityFilter?: string | null,
  regionFilter?: string | null,
): Promise<GlobeNonna[]> {
  const conditions = [publishedFilter];
  if (countryFilter) {
    conditions.push(
      eq(sql`lower(${recipes.country})`, countryFilter.toLowerCase()),
    );
  }
  if (regionFilter) {
    conditions.push(
      eq(sql`lower(${recipes.region})`, regionFilter.toLowerCase()),
    );
  }
  if (cityFilter) {
    conditions.push(eq(sql`lower(${recipes.city})`, cityFilter.toLowerCase()));
  }

  const rows = await db
    .select()
    .from(recipes)
    .where(and(...conditions));

  const markers: GlobeNonna[] = [];

  for (const r of rows) {
    const countryInfo = getCountryInfoWithFallback(r.country);
    const nonnaName = `${r.firstName} ${r.lastName}`;
    const dbCoords = parseCoordinates(r.coordinates);
    let baseCoords: { lat: number; lng: number };
    let useExactCoords = false;

    if (dbCoords) {
      baseCoords = dbCoords;
      useExactCoords = true;
    } else {
      baseCoords = getRegionCoordinates(
        r.region,
        countryInfo.code,
        countryInfo.lat,
        countryInfo.lng,
      );
    }

    let finalLat = baseCoords.lat;
    let finalLng = baseCoords.lng;
    if (!useExactCoords) {
      finalLat += (seedRandom(`${r.id}-lat`) - 0.5) * 1.5;
      finalLng += (seedRandom(`${r.id}-lng`) - 0.5) * 1.5;
    }

    markers.push({
      id: `nonna-${r.id}`,
      lat: finalLat,
      lng: finalLng,
      countryCode: countryInfo.code,
      countryName: r.country,
      nonnaCount: 1,
      representativeName: nonnaName,
      representativeTitle: r.grandmotherTitle,
      representativePhoto: r.avatar_image || r.photo?.[0] || null,
      recipeId: r.id,
      region: r.region || undefined,
      city: r.city || undefined,
      clusterLevel: "nonna",
    });
  }

  return markers;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || "EARTH";
    const countryParam = searchParams.get("country");
    const cityParam = searchParams.get("city");
    const regionParam = searchParams.get("region");

    if (level === "ALL") {
      const rows = await fetchGroupedRows();
      const layers = buildClusterLayers(rows);
      return NextResponse.json(layers, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (level === "NONNA") {
      const clusters = await fetchIndividualMarkers(
        countryParam,
        cityParam,
        regionParam,
      );
      return NextResponse.json(
        { clusters },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (level === "CITY") {
      const rows = await fetchGroupedRows(countryParam);
      const { cities } = buildClusterLayers(rows);
      let clusters = cities;
      if (regionParam) {
        const regionNorm = regionParam.toLowerCase().trim();
        clusters = clusters.filter(
          (c) => (c.region || "").toLowerCase().trim() === regionNorm,
        );
      }
      return NextResponse.json(
        { clusters },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (level === "EARTH") {
      const rows = await fetchGroupedRows();
      const { continents } = buildClusterLayers(rows);
      return NextResponse.json(
        { clusters: continents },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (level === "CONTINENT") {
      const rows = await fetchGroupedRows();
      const { continents } = buildClusterLayers(rows);
      return NextResponse.json(
        { clusters: continents },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (level === "COUNTRY") {
      const rows = await fetchGroupedRows();
      const { countries } = buildClusterLayers(rows);
      return NextResponse.json(
        { clusters: countries },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (level === "STATE") {
      const rows = await fetchGroupedRows(countryParam);
      const { states } = buildClusterLayers(rows);
      return NextResponse.json(
        { clusters: states },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: `Unknown level: ${level}` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Clustering API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
