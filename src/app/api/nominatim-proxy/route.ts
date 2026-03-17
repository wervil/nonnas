import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  try {
    // Forward all query params to Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Nonnas-App/1.0' // Required by Nominatim policy
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Nominatim proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boundary data' },
      { status: 500 }
    );
  }
}
