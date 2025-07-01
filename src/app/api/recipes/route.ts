import { NextRequest, NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { recipes, recipe_translations } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import * as deepl from 'deepl-node'
import { availableLanguages } from '@/utils/availableLanguages'

// Database connection using Neon
const db = drizzle(process.env.DATABASE_URL!)

const translator = new deepl.Translator(process.env.DEEPL_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.fullName || !body.country) {
      return NextResponse.json(
        { message: 'Full name and country are required fields' },
        { status: 400 }
      )
    }

    // Insert the recipe into the database
    const newRecipe = await db
      .insert(recipes)
      .values({
        user_id: body.user_id,
        fullName: body.fullName,
        country: body.country || null,
        region: body.region || null,
        history: body.history || null,
        geo_history: body.geo_history || null,
        recipe: body.recipe,
        influences: body.influences || null,
        photo: body.photo || null,
        recipe_image: body.recipe_image || null,
        dish_image: body.dish_image || null,
        release_signature: body.release_signature || false,
      })
      .returning()

    const recipeId = newRecipe[0].id
    const fields = ['history', 'geo_history', 'recipe', 'influences']

    // Prepare translation input
    const translations: Record<string, Record<string, string>> = {}
    for (const field of fields) {
      translations[field] = {}
    }

    // Translate each field to each target language
    for (const { lang } of availableLanguages) {
      for (const field of fields) {
        const value = body[field]
        if (value) {
          const result = await translator.translateText(
            value,
            null,
            lang.toUpperCase() as deepl.TargetLanguageCode,
            { tagHandling: 'html' }
          )
          translations[field][lang] = (Array.isArray(result) ? result[0].text : result.text)
        } else {
          translations[field][lang] = ''
        }
      }
    }

    // Insert translations for each language
    for (const { lang } of availableLanguages) {
      await db.insert(recipe_translations).values({
        recipe_id: recipeId,
        lang,
        history: translations['history'][lang],
        geo_history: translations['geo_history'][lang],
        recipe: translations['recipe'][lang],
        influences: translations['influences'][lang],
      })
    }

    return NextResponse.json(
      {
        message: 'Recipe created successfully',
        recipe: newRecipe[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')
    const publishedParam = searchParams.get('published')
    const langParam = searchParams.get('lang') || 'en-US'
    const search = searchParams.get('search')
    let result
    if (idParam) {
      result = await db
        .select({
          id: recipes.id,
          user_id: recipes.user_id,
          fullName: recipes.fullName,
          country: recipes.country,
          region: recipes.region,
          photo: recipes.photo,
          recipe_image: recipes.recipe_image,
          dish_image: recipes.dish_image,
          release_signature: recipes.release_signature,
          published: recipes.published,
          createdAt: recipes.createdAt,
          history: recipe_translations.history,
          geo_history: recipe_translations.geo_history,
          recipe: recipe_translations.recipe,
          influences: recipe_translations.influences,
        })
        .from(recipes)
        .leftJoin(
          recipe_translations,
          and(
            eq(recipe_translations.recipe_id, recipes.id),
            eq(recipe_translations.lang, langParam)
          )
        )
        .where(eq(recipes.id, Number(idParam)))
    } else if (search) {
      // Full-text search using search_vector
      result = await db
        .select({
          id: recipes.id,
          user_id: recipes.user_id,
          fullName: recipes.fullName,
          country: recipes.country,
          region: recipes.region,
          photo: recipes.photo,
          recipe_image: recipes.recipe_image,
          dish_image: recipes.dish_image,
          release_signature: recipes.release_signature,
          published: recipes.published,
          createdAt: recipes.createdAt,
          history: recipe_translations.history,
          geo_history: recipe_translations.geo_history,
          recipe: recipe_translations.recipe,
          influences: recipe_translations.influences,
        })
        .from(recipes)
        .leftJoin(
          recipe_translations,
          and(
            eq(recipe_translations.recipe_id, recipes.id),
            eq(recipe_translations.lang, langParam)
          )
        )
        .where(sql`${recipes.search_vector} @@ websearch_to_tsquery('english', ${search})`)
    } else {
      let published: boolean | undefined = undefined
      if (publishedParam === 'true') published = true
      if (publishedParam === 'false') published = false
      if (published !== undefined) {
        // Join with recipe_translations for langParam
        result = await db
          .select({
            id: recipes.id,
            user_id: recipes.user_id,
            fullName: recipes.fullName,
            country: recipes.country,
            region: recipes.region,
            photo: recipes.photo,
            recipe_image: recipes.recipe_image,
            dish_image: recipes.dish_image,
            release_signature: recipes.release_signature,
            published: recipes.published,
            createdAt: recipes.createdAt,
            history: recipe_translations.history,
            geo_history: recipe_translations.geo_history,
            recipe: recipe_translations.recipe,
            influences: recipe_translations.influences,
          })
          .from(recipes)
          .leftJoin(
            recipe_translations,
            and(
              eq(recipe_translations.recipe_id, recipes.id),
              eq(recipe_translations.lang, langParam)
            )
          )
          .where(eq(recipes.published, published))
      } else {
        // Join with recipe_translations for langParam
        result = await db
          .select({
            id: recipes.id,
            user_id: recipes.user_id,
            fullName: recipes.fullName,
            country: recipes.country,
            region: recipes.region,
            photo: recipes.photo,
            recipe_image: recipes.recipe_image,
            dish_image: recipes.dish_image,
            release_signature: recipes.release_signature,
            published: recipes.published,
            createdAt: recipes.createdAt,
            history: recipe_translations.history,
            geo_history: recipe_translations.geo_history,
            recipe: recipe_translations.recipe,
            influences: recipe_translations.influences,
          })
          .from(recipes)
          .leftJoin(
            recipe_translations,
            and(
              eq(recipe_translations.recipe_id, recipes.id),
              eq(recipe_translations.lang, langParam)
            )
          )
      }
    }
    return NextResponse.json({ recipes: result })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, published } = body
    if (typeof id !== 'number' || typeof published !== 'boolean') {
      return NextResponse.json({ message: 'Invalid id or published value' }, { status: 400 })
    }
    const updated = await db.update(recipes).set({ published }).where(eq(recipes.id, id)).returning()
    if (!updated.length) {
      return NextResponse.json({ message: 'Recipe not found' }, { status: 404 })
    }
    return NextResponse.json({ recipe: updated[0] })
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
