import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const NOMINATIM_TIMEOUT_MS = 5000;

type CacheEntry = { data: unknown; expires: number };

/** Warm-instance cache — cuts repeat lookups during a session. */
const responseCache = new Map<string, CacheEntry>();

function cacheKey(params: URLSearchParams): string {
  return [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

function getCached(key: string): unknown | null {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    responseCache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key: string, data: unknown) {
  responseCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
  // Keep cache bounded on long-lived dev servers
  if (responseCache.size > 500) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
}

export async function GET(request: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const params = new URLSearchParams(searchParams.toString());

  try {
    params.delete("featuretype");

    const locationParams = ["city", "state", "country", "county", "region"];
    let locationValue: string | null = null;

    for (const param of locationParams) {
      const value = params.get(param);
      if (value) {
        locationValue = value;
        params.delete(param);
        break;
      }
    }

    if (locationValue) {
      params.set("q", locationValue);
    }

    params.set("format", "json");
    params.set("limit", "1");
    params.set("polygon_geojson", "1");
    params.set("addressdetails", "1");

    const key = cacheKey(params);
    const cached = getCached(key);
    if (cached !== null) {
      return NextResponse.json(cached, {
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Nominatim-Cache": "HIT",
        },
      });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Nonnas-App/1.0 (contact@nonnas.app)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        "[Nominatim Proxy] API error:",
        response.status,
        response.statusText,
      );
      return NextResponse.json([], {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    const data = await response.json();
    setCached(key, data);

    const cacheHeaders = {
      ...corsHeaders,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "CDN-Cache-Control": "public, max-age=3600",
      "Vercel-CDN-Cache-Control": "public, max-age=3600",
    };

    return NextResponse.json(data, { headers: cacheHeaders });
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        /ETIMEDOUT|timeout/i.test(String(error)));

    if (isTimeout) {
      console.warn("[Nominatim Proxy] Timed out — returning empty");
    } else {
      console.error("[Nominatim Proxy] Error:", error);
    }

    return NextResponse.json([], {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}
