import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/neon-serverless";
import { recipes } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { getCountryInfoWithFallback } from "@/lib/countryData";
import { countriesData } from "@/utils/countries";

const db = drizzle(process.env.DATABASE_URL!);

export type NonnasByState = {
  stateName: string;
  lat: number;
  lng: number;
  nonnaCount: number;
  placeId?: string;
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

// Generate a deterministic "random" offset based on a string (to avoid marker position changes on refresh)
// Helper function to normalize region names for better matching
function normalizeRegionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function hashStringToOffset(str: string): { latOffset: number; lngOffset: number } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Use different bits for lat and lng to get more distributed offsets
  const latOffset = ((hash & 0xFFFF) / 0xFFFF - 0.5) * 8; // -4 to +4 degrees (larger spread)
  const lngOffset = (((hash >> 16) & 0xFFFF) / 0xFFFF - 0.5) * 8; // -4 to +4 degrees (larger spread)
  return { latOffset, lngOffset };
}

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
    // States
    "andhra pradesh": { lat: 15.9129, lng: 79.7400 },
    "arunachal pradesh": { lat: 28.2180, lng: 94.7278 },
    "assam": { lat: 26.2006, lng: 92.9376 },
    "bihar": { lat: 25.0961, lng: 85.3131 },
    "chhattisgarh": { lat: 21.2787, lng: 81.8661 },
    "goa": { lat: 15.2993, lng: 74.1240 },
    "gujarat": { lat: 22.2587, lng: 71.1924 },
    "haryana": { lat: 29.0588, lng: 76.0856 },
    "himachal pradesh": { lat: 31.1048, lng: 77.1734 },
    "jharkhand": { lat: 23.6102, lng: 85.2799 },
    "karnataka": { lat: 15.3173, lng: 75.7139 },
    "kerala": { lat: 10.8505, lng: 76.2711 },
    "madhya pradesh": { lat: 22.9734, lng: 78.6569 },
    "maharashtra": { lat: 19.7515, lng: 75.7139 },
    "manipur": { lat: 24.6637, lng: 93.9063 },
    "meghalaya": { lat: 25.4670, lng: 91.3662 },
    "mizoram": { lat: 23.1645, lng: 92.9376 },
    "nagaland": { lat: 26.1584, lng: 94.5624 },
    "odisha": { lat: 20.9517, lng: 85.0985 },
    "orissa": { lat: 20.9517, lng: 85.0985 }, // Alternative name
    "punjab": { lat: 31.1471, lng: 75.3412 },
    "rajasthan": { lat: 27.0238, lng: 74.2179 },
    "sikkim": { lat: 27.5330, lng: 88.5122 },
    "tamil nadu": { lat: 11.1271, lng: 78.6569 },
    "telangana": { lat: 18.1124, lng: 79.0193 },
    "tripura": { lat: 23.9408, lng: 91.9882 },
    "uttar pradesh": { lat: 26.8467, lng: 80.9462 },
    "uttarakhand": { lat: 30.0668, lng: 79.0193 },
    "uttaranchal": { lat: 30.0668, lng: 79.0193 }, // Old name
    "west bengal": { lat: 22.9868, lng: 87.8550 },
    // Union Territories
    "andaman and nicobar islands": { lat: 11.7401, lng: 92.6586 },
    "andaman and nicobar": { lat: 11.7401, lng: 92.6586 },
    "chandigarh": { lat: 30.7333, lng: 76.7794 },
    "dadra and nagar haveli and daman and diu": { lat: 20.1809, lng: 73.0169 },
    "dadra and nagar haveli": { lat: 20.1809, lng: 73.0169 },
    "daman and diu": { lat: 20.4283, lng: 72.8397 },
    "delhi": { lat: 28.7041, lng: 77.1025 },
    "national capital territory of delhi": { lat: 28.7041, lng: 77.1025 },
    "nct of delhi": { lat: 28.7041, lng: 77.1025 },
    "jammu and kashmir": { lat: 33.7782, lng: 76.5762 },
    "ladakh": { lat: 34.1526, lng: 77.5771 },
    "lakshadweep": { lat: 10.5667, lng: 72.6417 },
    "puducherry": { lat: 11.9416, lng: 79.8083 },
    "pondicherry": { lat: 11.9416, lng: 79.8083 }, // Old name
  },
  PK: {
    // Pakistan provinces and territories
    "punjab": { lat: 31.1704, lng: 72.7097 },
    "sindh": { lat: 25.8943, lng: 68.5247 },
    "sind": { lat: 25.8943, lng: 68.5247 },
    "khyber pakhtunkhwa": { lat: 34.9526, lng: 72.3311 },
    "khyber-pakhtunkhwa": { lat: 34.9526, lng: 72.3311 },
    "khyberpakhtunkhwa": { lat: 34.9526, lng: 72.3311 },
    "khaibar pakhtunkhwa": { lat: 34.9526, lng: 72.3311 }, // Alternative spelling with 'i'
    "khaibar-pakhtunkhwa": { lat: 34.9526, lng: 72.3311 },
    "khaibarpakhtunkhwa": { lat: 34.9526, lng: 72.3311 },
    "kpk": { lat: 34.9526, lng: 72.3311 }, // Acronym
    "nwfp": { lat: 34.9526, lng: 72.3311 }, // Old name
    "north-west frontier province": { lat: 34.9526, lng: 72.3311 },
    "balochistan": { lat: 28.6139, lng: 65.3479 },
    "baluchistan": { lat: 28.6139, lng: 65.3479 },
    "gilgit-baltistan": { lat: 35.8186, lng: 74.5980 },
    "gilgit baltistan": { lat: 35.8186, lng: 74.5980 },
    "azad kashmir": { lat: 33.9259, lng: 73.7804 },
    "azad jammu and kashmir": { lat: 33.9259, lng: 73.7804 },
    "ajk": { lat: 33.9259, lng: 73.7804 }, // Acronym
    "islamabad": { lat: 33.6844, lng: 73.0479 },
    "islamabad capital territory": { lat: 33.6844, lng: 73.0479 },
    "federally administered tribal areas": { lat: 32.7167, lng: 70.0000 },
    "fata": { lat: 32.7167, lng: 70.0000 },
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
  VE: {
    "bolívar": { lat: 7.0000, lng: -63.5000 },
    "bolivar": { lat: 7.0000, lng: -63.5000 },
    "caracas": { lat: 10.4806, lng: -66.9036 },
    "zulia": { lat: 10.0000, lng: -71.8000 },
    "miranda": { lat: 10.3000, lng: -66.5000 },
    "aragua": { lat: 10.2500, lng: -67.5000 },
    "carabobo": { lat: 10.2000, lng: -68.0000 },
    "lara": { lat: 10.0500, lng: -69.8500 },
  },
  CO: {
    "bogotá": { lat: 4.7110, lng: -74.0721 },
    "bogota": { lat: 4.7110, lng: -74.0721 },
    "antioquia": { lat: 6.2518, lng: -75.5636 },
    "valle del cauca": { lat: 3.4516, lng: -76.5320 },
    "atlántico": { lat: 10.9685, lng: -74.7813 },
    "santander": { lat: 7.1254, lng: -73.1198 },
  },
  AR: {
    "buenos aires": { lat: -34.6037, lng: -58.3816 },
    "córdoba": { lat: -31.4201, lng: -64.1888 },
    "cordoba": { lat: -31.4201, lng: -64.1888 },
    "santa fe": { lat: -31.6333, lng: -60.7000 },
    "mendoza": { lat: -32.8895, lng: -68.8458 },
  },
  BR: {
    "são paulo": { lat: -23.5505, lng: -46.6333 },
    "sao paulo": { lat: -23.5505, lng: -46.6333 },
    "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
    "minas gerais": { lat: -19.8157, lng: -43.9542 },
    "bahia": { lat: -12.9714, lng: -38.5014 },
    "paraná": { lat: -25.2521, lng: -52.0215 },
  },
  PE: {
    "lima": { lat: -12.0464, lng: -77.0428 },
    "arequipa": { lat: -16.4090, lng: -71.5375 },
    "cusco": { lat: -13.5320, lng: -71.9675 },
    "la libertad": { lat: -8.1091, lng: -79.0215 },
  },
  CL: {
    "santiago": { lat: -33.4489, lng: -70.6693 },
    "valparaíso": { lat: -33.0472, lng: -71.6127 },
    "valparaiso": { lat: -33.0472, lng: -71.6127 },
    "biobío": { lat: -37.4689, lng: -72.3527 },
  },
  SE: {
    "stockholm": { lat: 59.3293, lng: 18.0686 },
    "göteborg": { lat: 57.7089, lng: 11.9746 },
    "malmö": { lat: 55.6050, lng: 13.0038 },
    "uppsala": { lat: 59.8586, lng: 17.6389 },
    "västerås": { lat: 59.6162, lng: 16.5528 },
    "örebro": { lat: 59.2741, lng: 15.2066 },
    "linköping": { lat: 58.4108, lng: 15.6214 },
    "helsingborg": { lat: 56.0465, lng: 12.6945 },
    "jönköping": { lat: 57.7826, lng: 14.1618 },
    "norrköping": { lat: 58.5877, lng: 16.1924 },
    "lund": { lat: 55.7047, lng: 13.1910 },
    "umeå": { lat: 63.8258, lng: 20.2630 },
    "gävle": { lat: 60.6749, lng: 17.1413 },
    "borås": { lat: 57.7210, lng: 12.9401 },
    "södertälje": { lat: 59.1955, lng: 17.6253 },
  },
  FI: {
    "helsinki": { lat: 60.1699, lng: 24.9384 },
    "espoo": { lat: 60.2055, lng: 24.6559 },
    "tampere": { lat: 61.4991, lng: 23.7871 },
    "vantaa": { lat: 60.2934, lng: 25.0378 },
    "oulu": { lat: 65.0121, lng: 25.4651 },
    "turku": { lat: 60.4518, lng: 22.2666 },
    "jyväskylä": { lat: 62.2426, lng: 25.7473 },
    "lahti": { lat: 60.9827, lng: 25.6612 },
    "kuopio": { lat: 62.8924, lng: 27.6780 },
    "pori": { lat: 61.4847, lng: 21.7972 },
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

    // Use countriesData as the source of truth for regions
    const countryData = countriesData[code.toUpperCase()];
    const regionsList = countryData ? countryData.regions : [];

    // Convert to array with coordinates
    const stateCoords = stateCoordinates[code.toUpperCase()] || {};
    const states: NonnasByState[] = [];

    // First, add all states from the predefined list (even if empty)
    for (const regionName of regionsList) {
      console.log(`[${code.toUpperCase()}] Processing region: "${regionName}"`);
      
      // Check if we have nonnas for this state
      // We need to check case-insensitive matching against keys in stateMap
      let matchingStateName = "";
      for (const mapKey of stateMap.keys()) {
        if (mapKey.toLowerCase() === regionName.toLowerCase()) {
          matchingStateName = mapKey;
          break;
        }
      }

      const nonnas = matchingStateName ? stateMap.get(matchingStateName)! : [];

      // First try hardcoded coordinates (most reliable)
      let coords: { lat: number; lng: number } | undefined;
      let placeId: string | undefined;
      
      const normalizedRegion = normalizeRegionName(regionName);
      
      // Try exact normalized match in hardcoded coordinates
      for (const [key, value] of Object.entries(stateCoords)) {
        if (normalizeRegionName(key) === normalizedRegion) {
          coords = value;
          console.log(`  ✓ Found hardcoded coords for "${regionName}" → (${value.lat}, ${value.lng})`);
          break;
        }
      }

      // If no exact match, try partial matching in hardcoded coordinates
      if (!coords) {
        for (const [key, value] of Object.entries(stateCoords)) {
          const normalizedKey = normalizeRegionName(key);
          if (normalizedKey.includes(normalizedRegion) || normalizedRegion.includes(normalizedKey)) {
            coords = value;
            console.log(`  ✓ Partial match hardcoded coords for "${regionName}" → "${key}" → (${value.lat}, ${value.lng})`);
            break;
          }
        }
      }
      
      // Fall back to Google Geocoding API if no hardcoded coords
      if (!coords) {
        try {
          // Use components parameter to restrict search to the specific country
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(regionName)}&components=country:${code.toUpperCase()}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
          const geocodeRes = await fetch(geocodeUrl);
          const geocodeData = await geocodeRes.json();
          
          if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
            // Find the result that's an administrative area (state/province)
            let result = geocodeData.results.find((r: any) => 
              r.types?.includes('administrative_area_level_1') ||
              r.types?.includes('administrative_area_level_2')
            ) || geocodeData.results[0];
            
            const location = result.geometry.location;
            coords = {
              lat: location.lat,
              lng: location.lng
            };
            placeId = result.place_id;
            console.log(`  ✓ Geocoded "${regionName}" in ${code} → (${coords.lat}, ${coords.lng}) [${result.formatted_address}]`);
          } else {
            console.log(`  ✗ Geocoding failed for "${regionName}" in ${code}: ${geocodeData.status}`);
          }
        } catch (error) {
          console.warn(`  ✗ Geocoding error for ${regionName}, ${countryName}:`, error);
        }
      }

      // Final fallback to deterministic offset if geocoding fails
      if (!coords) {
        const offset = hashStringToOffset(`${code.toUpperCase()}-${regionName}`);
        coords = {
          lat: countryInfo.lat + offset.latOffset,
          lng: countryInfo.lng + offset.lngOffset
        };
        console.log(`  ⚠ Using hash-based fallback for "${regionName}" → (${coords.lat}, ${coords.lng})`);
      }

      console.log(`  → Final coordinates for "${regionName}": (${coords.lat}, ${coords.lng})\n`);

      states.push({
        stateName: regionName,
        lat: coords.lat,
        lng: coords.lng,
        nonnaCount: nonnas.length,
        nonnas: nonnas,
        placeId: placeId, // Include place ID for accurate boundary matching
      });

      // Remove from map to track which ones we've processed
      if (matchingStateName) {
        stateMap.delete(matchingStateName);
      }
    }

    // Then add any remaining states from the DB that weren't in the predefined list
    // This handles cases where DB region name doesn't match countriesData exactly
    for (const [stateName, nonnas] of stateMap.entries()) {
      // Use deterministic offset based on state name
      const offsets = hashStringToOffset(`${code.toUpperCase()}-${stateName}`);
      const lat = countryInfo.lat + offsets.latOffset;
      const lng = countryInfo.lng + offsets.lngOffset;

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

