import { NextRequest, NextResponse } from "next/server";

// Country code to ISO 3166-1 alpha-3 mapping for some common countries
const countryCodeMap: Record<string, string> = {
  IN: "IND",
  PK: "PAK",
  IT: "ITA",
  US: "USA",
  GB: "GBR",
  FR: "FRA",
  DE: "DEU",
  ES: "ESP",
  BR: "BRA",
  MX: "MEX",
  CN: "CHN",
  JP: "JPN",
  AU: "AUS",
  CA: "CAN",
  RU: "RUS",
  AR: "ARG",
  CO: "COL",
  PE: "PER",
  VE: "VEN",
  CL: "CHL",
  SE: "SWE",
  NO: "NOR",
  FI: "FIN",
  DK: "DNK",
  NL: "NLD",
  BE: "BEL",
  AT: "AUT",
  CH: "CHE",
  PL: "POL",
  GR: "GRC",
  PT: "PRT",
  IE: "IRL",
  NZ: "NZL",
  ZA: "ZAF",
  EG: "EGY",
  NG: "NGA",
  KE: "KEN",
  TH: "THA",
  VN: "VNM",
  ID: "IDN",
  MY: "MYS",
  PH: "PHL",
  SG: "SGP",
  KR: "KOR",
  TR: "TUR",
  SA: "SAU",
  AE: "ARE",
  IL: "ISR",
  BD: "BGD",
  LK: "LKA",
};

// Type definitions for GeoJSON feature properties
interface FeatureProperties {
  [key: string]: unknown;
  NAME_1?: string;
  name?: string;
  admin1?: string;
  name_en?: string;
  ISO_1?: string;
  HASC_1?: string;
  iso_3166_2?: string;
  iso_a2?: string;
  ISO_A2?: string;
  adm0_a3?: string;
  GID_0?: string;
  admin?: string;
}

interface GeoJSONFeature {
  type: string;
  properties: FeatureProperties;
  geometry: unknown;
}

interface GeoJSONResponse {
  features?: GeoJSONFeature[];
  [key: string]: unknown;
}

// API to fetch GeoJSON state/province boundaries for a country
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  const { country } = await params;
  const countryCode = country.toUpperCase();
  const alpha3 = countryCodeMap[countryCode] || countryCode;

  console.log(
    `📍 Fetching GeoJSON boundaries for ${countryCode} (${alpha3})...`
  );

  // Try multiple sources in order of reliability
  const sources = [
    // Source 1: Natural Earth via GitHub (most reliable, always available)
    `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson`,
    // Source 2: GADM (most detailed, but may not exist for all countries - use lowercase)
    `https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_${countryCode.toLowerCase()}_1.json`,
    // Source 3: OpenDataSoft (backup)
    `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/world-administrative-boundaries/exports/geojson?where=iso3%3D%22${alpha3}%22`,
  ];

  for (const sourceUrl of sources) {
    try {
      console.log(`Trying source: ${sourceUrl.substring(0, 60)}...`);

      const response = await fetch(sourceUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "NonnaRecipes/1.0",
        },
        next: { revalidate: 86400 }, // Cache for 24 hours
      });

      if (!response.ok) {
        console.log(`Source failed with status ${response.status}`);
        continue;
      }

      const geojson = (await response.json()) as GeoJSONResponse;

      let features: Array<{
        type: string;
        properties: {
          name: string;
          code: string;
          country: string;
        };
        geometry: unknown;
      }> = [];

      // Handle different GeoJSON formats
      if (geojson.features) {
        // Filter features for this country if it's a global dataset
        // Note: GADM URLs are country-specific, so if it's GADM and we got data, use all features
        if (sourceUrl.includes("gadm")) {
          // GADM files are already filtered by country, use all features
          features = geojson.features.map((feature: GeoJSONFeature) => ({
            type: "Feature",
            properties: {
              name:
                feature.properties?.NAME_1 ||
                feature.properties?.name ||
                feature.properties?.admin1 ||
                feature.properties?.name_en ||
                "Unknown",
              code:
                feature.properties?.ISO_1 ||
                feature.properties?.HASC_1 ||
                feature.properties?.iso_3166_2 ||
                "",
              country: countryCode,
            },
            geometry: feature.geometry,
          }));
        } else {
          // For global datasets (Natural Earth, OpenDataSoft), filter by country
          features = geojson.features
            .filter((f: GeoJSONFeature) => {
              const props = f.properties || {};
              const featureCountry =
                props.iso_a2 ||
                props.ISO_A2 ||
                props.adm0_a3 ||
                props.GID_0 ||
                "";
              // Match by country code
              return (
                featureCountry === countryCode ||
                featureCountry === alpha3 ||
                props.admin === countryCode
              );
            })
            .map((feature: GeoJSONFeature) => ({
              type: "Feature",
              properties: {
                name:
                  feature.properties?.NAME_1 ||
                  feature.properties?.name ||
                  feature.properties?.admin1 ||
                  feature.properties?.name_en ||
                  "Unknown",
                code:
                  feature.properties?.ISO_1 ||
                  feature.properties?.HASC_1 ||
                  feature.properties?.iso_3166_2 ||
                  "",
                country: countryCode,
              },
              geometry: feature.geometry,
            }));
        }
      }

      if (features.length > 0) {
        console.log(
          `✓ Found ${features.length} states/provinces for ${countryCode}`
        );
        return NextResponse.json({
          type: "FeatureCollection",
          features,
          country: countryCode,
          count: features.length,
          source: sourceUrl.includes("gadm")
            ? "GADM"
            : sourceUrl.includes("natural-earth")
            ? "Natural Earth"
            : "OpenDataSoft",
        });
      }
    } catch (error) {
      console.log(`Source error:`, error);
      continue;
    }
  }

  // If all sources fail, return empty but with helpful message
  console.warn(`⚠ No GeoJSON boundaries found for ${countryCode}`);
  return NextResponse.json({
    type: "FeatureCollection",
    features: [],
    country: countryCode,
    count: 0,
    error: "No state boundaries available for this country",
  });
}
