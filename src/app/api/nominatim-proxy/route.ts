import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    // Forward modified query params to Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Nonnas-App/1.0", // Required by Nominatim policy
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Nominatim proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch boundary data" },
      { status: 500 },
    );
  }
}
