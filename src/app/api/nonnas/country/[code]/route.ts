import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/neon-serverless";
import { recipes } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { getCountryInfoWithFallback } from "@/lib/countryData";

const db = drizzle(process.env.DATABASE_URL!);

export type NonnasByState = {
  stateName: string;
  lat: number;
  lng: number;
  nonnaCount: number;
  nonnas: {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    grandmotherTitle: string;
    recipeTitle: string;
    region: string | null;
    photo: string[] | null;
  }[];
};

// State/region coordinates (approximate centers)
const stateCoordinates: Record<string, Record<string, { lat: number; lng: number }>> = {
  US: {
    "alabama": { lat: 32.3182, lng: -86.9023 },
    "alaska": { lat: 64.2008, lng: -152.4937 },
    "arizona": { lat: 34.0489, lng: -111.0937 },
    "arkansas": { lat: 34.7465, lng: -92.2896 },
    "california": { lat: 36.7783, lng: -119.4179 },
    "colorado": { lat: 39.5501, lng: -105.7821 },
    "connecticut": { lat: 41.6032, lng: -73.0877 },
    "delaware": { lat: 38.9108, lng: -75.5277 },
    "florida": { lat: 27.6648, lng: -81.5158 },
    "georgia": { lat: 32.1574, lng: -82.9071 },
    "hawaii": { lat: 19.8968, lng: -155.5828 },
    "idaho": { lat: 44.0682, lng: -114.742 },
    "illinois": { lat: 40.6331, lng: -89.3985 },
    "indiana": { lat: 40.2672, lng: -86.1349 },
    "iowa": { lat: 41.878, lng: -93.0977 },
    "kansas": { lat: 39.0119, lng: -98.4842 },
    "kentucky": { lat: 37.8393, lng: -84.27 },
    "louisiana": { lat: 31.2448, lng: -92.1450 },
    "maine": { lat: 45.2538, lng: -69.4455 },
    "maryland": { lat: 39.0458, lng: -76.6413 },
    "massachusetts": { lat: 42.4072, lng: -71.3824 },
    "michigan": { lat: 44.3148, lng: -85.6024 },
    "minnesota": { lat: 46.7296, lng: -94.6859 },
    "mississippi": { lat: 32.3547, lng: -89.3985 },
    "missouri": { lat: 37.9643, lng: -91.8318 },
    "montana": { lat: 46.8797, lng: -110.3626 },
    "nebraska": { lat: 41.4925, lng: -99.9018 },
    "nevada": { lat: 38.8026, lng: -116.4194 },
    "new hampshire": { lat: 43.1939, lng: -71.5724 },
    "new jersey": { lat: 40.0583, lng: -74.4057 },
    "new mexico": { lat: 34.5199, lng: -105.8701 },
    "new york": { lat: 43.2994, lng: -74.2179 },
    "north carolina": { lat: 35.7596, lng: -79.0193 },
    "north dakota": { lat: 47.5515, lng: -101.002 },
    "ohio": { lat: 40.4173, lng: -82.9071 },
    "oklahoma": { lat: 35.0078, lng: -97.0929 },
    "oregon": { lat: 43.8041, lng: -120.5542 },
    "pennsylvania": { lat: 41.2033, lng: -77.1945 },
    "rhode island": { lat: 41.5801, lng: -71.4774 },
    "south carolina": { lat: 33.8361, lng: -81.1637 },
    "south dakota": { lat: 43.9695, lng: -99.9018 },
    "tennessee": { lat: 35.5175, lng: -86.5804 },
    "texas": { lat: 31.9686, lng: -99.9018 },
    "utah": { lat: 39.3209, lng: -111.0937 },
    "vermont": { lat: 44.5588, lng: -72.5778 },
    "virginia": { lat: 37.4316, lng: -78.6569 },
    "washington": { lat: 47.7511, lng: -120.7401 },
    "west virginia": { lat: 38.5976, lng: -80.4549 },
    "wisconsin": { lat: 43.7844, lng: -88.7879 },
    "wyoming": { lat: 43.0759, lng: -107.2903 },
  },
  IT: {
    "lombardy": { lat: 45.4791, lng: 9.8452 },
    "lazio": { lat: 41.8967, lng: 12.4822 },
    "tuscany": { lat: 43.4148, lng: 11.2194 },
    "veneto": { lat: 45.4414, lng: 12.3155 },
    "piedmont": { lat: 45.0703, lng: 7.6869 },
    "emilia-romagna": { lat: 44.4938, lng: 11.3426 },
    "campania": { lat: 40.8518, lng: 14.2681 },
    "sicily": { lat: 37.5999, lng: 14.0154 },
    "sardinia": { lat: 40.1209, lng: 9.0129 },
    "calabria": { lat: 38.9060, lng: 16.5943 },
    "puglia": { lat: 41.1257, lng: 16.8667 },
  },
  IN: {
    "delhi": { lat: 28.7041, lng: 77.1025 },
    "maharashtra": { lat: 19.7515, lng: 75.7139 },
    "karnataka": { lat: 15.3173, lng: 75.7139 },
    "tamil nadu": { lat: 11.1271, lng: 78.6569 },
    "kerala": { lat: 10.8505, lng: 76.2711 },
    "west bengal": { lat: 22.9868, lng: 87.8550 },
    "uttar pradesh": { lat: 26.8467, lng: 80.9462 },
    "rajasthan": { lat: 27.0238, lng: 74.2179 },
    "gujarat": { lat: 22.2587, lng: 71.1924 },
    "punjab": { lat: 31.1471, lng: 75.3412 },
  },
  MX: {
    "mexico city": { lat: 19.4326, lng: -99.1332 },
    "jalisco": { lat: 20.6595, lng: -103.3494 },
    "nuevo león": { lat: 25.5922, lng: -99.9962 },
    "yucatán": { lat: 20.7099, lng: -89.0943 },
    "oaxaca": { lat: 17.0732, lng: -96.7266 },
    "puebla": { lat: 19.0414, lng: -98.2063 },
    "veracruz": { lat: 19.1738, lng: -96.1342 },
    "guanajuato": { lat: 21.0190, lng: -101.2574 },
  },
  FR: {
    "île-de-france": { lat: 48.8499, lng: 2.6370 },
    "provence": { lat: 43.9352, lng: 6.0679 },
    "normandy": { lat: 49.1829, lng: -0.3707 },
    "brittany": { lat: 48.2020, lng: -2.9326 },
    "bordeaux": { lat: 44.8378, lng: -0.5792 },
    "lyon": { lat: 45.7640, lng: 4.8357 },
  },
};

/**
 * GET /api/nonnas/country/[code]
 * Returns nonnas grouped by state/region for a specific country
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(request.url);
    const countryName = searchParams.get("name") || "";
    const publishedParam = searchParams.get("published");
    const published = publishedParam !== "false";

    // Build conditions to match the country
    const conditions = [];
    
    if (published) {
      conditions.push(eq(recipes.published, true));
    }

    // Match by country name (case-insensitive, partial match)
    // We'll match multiple possible names
    const countryInfo = getCountryInfoWithFallback(countryName || code);
    conditions.push(
      or(
        ilike(recipes.country, countryInfo.name),
        ilike(recipes.country, `%${countryInfo.name}%`),
        ilike(recipes.country, code)
      )!
    );

    // Get all recipes for this country
    const countryRecipes = await db
      .select({
        id: recipes.id,
        firstName: recipes.firstName,
        lastName: recipes.lastName,
        grandmotherTitle: recipes.grandmotherTitle,
        recipeTitle: recipes.recipeTitle,
        country: recipes.country,
        region: recipes.region,
        photo: recipes.photo,
      })
      .from(recipes)
      .where(and(...conditions));

    // Group by state/region
    const stateMap = new Map<string, NonnasByState["nonnas"]>();

    for (const recipe of countryRecipes) {
      const stateName = recipe.region?.trim() || "Unknown Region";
      
      if (!stateMap.has(stateName)) {
        stateMap.set(stateName, []);
      }

      stateMap.get(stateName)!.push({
        id: recipe.id,
        name: `${recipe.grandmotherTitle} ${recipe.firstName} ${recipe.lastName}`.trim(),
        firstName: recipe.firstName,
        lastName: recipe.lastName,
        grandmotherTitle: recipe.grandmotherTitle,
        recipeTitle: recipe.recipeTitle,
        region: recipe.region,
        photo: recipe.photo,
      });
    }

    // Convert to array with coordinates
    const stateCoords = stateCoordinates[code.toUpperCase()] || {};
    const states: NonnasByState[] = [];

    for (const [stateName, nonnas] of stateMap.entries()) {
      const normalizedState = stateName.toLowerCase();
      const coords = stateCoords[normalizedState];

      // If we don't have specific state coords, use country center with slight offset
      const lat = coords?.lat ?? countryInfo.lat + (Math.random() - 0.5) * 5;
      const lng = coords?.lng ?? countryInfo.lng + (Math.random() - 0.5) * 5;

      states.push({
        stateName,
        lat,
        lng,
        nonnaCount: nonnas.length,
        nonnas,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        countryCode: code.toUpperCase(),
        countryName: countryInfo.name,
        continent: countryInfo.continent,
        states,
        totalNonnas: countryRecipes.length,
      },
    });
  } catch (error) {
    console.error("Error fetching country data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch country data" },
      { status: 500 }
    );
  }
}

