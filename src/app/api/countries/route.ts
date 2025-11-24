import { NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { recipes } from '@/db/schema'

const db = drizzle(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const uniqueCountries = await db
      .selectDistinct({ country: recipes.country })
      .from(recipes)
      .orderBy(recipes.country)

    return NextResponse.json({ countries: uniqueCountries })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
