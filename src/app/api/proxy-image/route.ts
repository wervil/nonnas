import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ message: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return NextResponse.json(
      { message: "Error fetching image" },
      { status: 500 },
    );
  }
}
