import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Add CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle OPTIONS preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams(searchParams.toString());

  try {
    // Remove featuretype parameter
    params.delete("featuretype");

    // Convert location parameters to q parameter
    const locationParams = ["city", "state", "country", "county", "region"];
    let locationValue = null;

    for (const param of locationParams) {
      const value = params.get(param);
      if (value) {
        locationValue = value;
        params.delete(param);
        break; // Use the first location parameter found
      }
    }

    if (locationValue) {
      params.set("q", locationValue);
    }

    // Add required Nominatim parameters
    params.set("format", "json");
    params.set("limit", "1");
    params.set("polygon_geojson", "1");
    params.set("addressdetails", "1");

    // Forward modified query params to Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    console.log("[Nominatim Proxy] Fetching:", nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Nonnas-App/1.0 (contact@nonnas.app)", // Required by Nominatim policy
        Accept: "application/json",
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error(
        "[Nominatim Proxy] API error:",
        response.status,
        response.statusText,
      );
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Add cache control headers to respect Nominatim's rate limits
    const cacheHeaders = {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600, s-maxage=3600", // Cache for 1 hour
      "CDN-Cache-Control": "public, max-age=3600",
      "Vercel-CDN-Cache-Control": "public, max-age=3600",
    };

    console.log("[Nominatim Proxy] Success:", data.length, "results");

    return NextResponse.json(data, { headers: cacheHeaders });
  } catch (error) {
    console.error("[Nominatim Proxy] Error:", error);

    // Return proper error response with CORS headers
    return NextResponse.json(
      {
        error: "Failed to fetch boundary data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}
