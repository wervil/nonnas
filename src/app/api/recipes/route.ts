import { NextRequest, NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { recipes, likes } from '@/db/schema'
import { eq, sql, and, ilike, inArray } from 'drizzle-orm'
import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'
// import * as deepl from 'deepl-node'
// import { availableLanguages } from '@/utils/availableLanguages'
// import { translateText } from '../services/libretranslate'

// function groupByCountry(arr: Recipe[]) {
//   return arr.reduce<Record<string, Recipe[]>>((acc, recipe) => {
//     const country = recipe.country || 'Unknown'
//     if (!acc[country]) acc[country] = []
//     acc[country].push(recipe)
//     return acc
//   }, {})
// }

import { moderateContent } from '@/services/moderation'

// Database connection using Neon
const db = drizzle(process.env.DATABASE_URL!)

// const translator = new deepl.Translator(process.env.DEEPL_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (
      !body.grandmotherTitle ||
      !body.country ||
      !body.firstName ||
      !body.lastName ||
      !body.recipeTitle ||
      !body.recipe ||
      !body.directions ||
      !body.history ||
      !body.user_id
    ) {
      return NextResponse.json(
        { message: 'Fill all required fields' },
        { status: 400 }
      )
    }

    // Content Moderation
    const contentToCheck = [
      body.grandmotherTitle,
      body.firstName,
      body.lastName,
      body.recipeTitle,
      body.history,
      body.geo_history,
      body.recipe,
      body.directions,
      body.influences,
      body.traditions
    ].filter(Boolean).join('\n');

    const isFlagged = await moderateContent(contentToCheck);
    if (isFlagged) {
      return NextResponse.json(
        { message: 'Content flagged as inappropriate.' },
        { status: 400 }
      )
    }

    // Check for admin permissions to auto-publish
    const user = await stackServerApp.getUser()
    const isAdmin = user ? await checkAdminPermission(user) : false

    // Insert the recipe into the database
    const newRecipe = await db
      .insert(recipes)
      .values({
        user_id: body.user_id || '12',
        grandmotherTitle: body.grandmotherTitle,
        firstName: body.firstName,
        lastName: body.lastName,
        recipeTitle: body.recipeTitle,
        country: body.country || null,
        region: body.region || null,
        history: body.history || null,
        geo_history: body.geo_history || null,
        recipe: body.recipe,
        directions: body.directions || null,
        influences: body.influences || null,
        traditions: body.traditions || null,
        photo: body.photo || null,
        recipe_image: body.recipe_image || null,
        dish_image: body.dish_image || null,
        release_signature: body.release_signature || false,
        published: isAdmin, // Auto-publish if admin
      })
      .returning()

    // const recipeId = newRecipe[0].id
    // const fields = ['history', 'geo_history', 'recipe', 'influences']

    // Prepare translation input
    // const translations: Record<string, Record<string, string>> = {}
    // for (const field of fields) {
    //   translations[field] = {}
    // }

    // // Translate each field to each target language
    // for (const { lang } of availableLanguages) {
    //   for (const field of fields) {
    //     const value = body[field]
    //     if (value) {
    //       const result = await translateText(value, lang.toLowerCase())

    //       translations[field][lang] = result
    //     } else {
    //       translations[field][lang] = ''
    //     }
    //   }
    // }

    // // Insert translations for each language
    // for (const { lang } of availableLanguages) {
    //   await db.insert(recipe_translations).values({
    //     recipe_id: recipeId,
    //     lang,
    //     history: translations['history'][lang],
    //     geo_history: translations['geo_history'][lang],
    //     recipe: translations['recipe'][lang],
    //     influences: translations['influences'][lang],
    //   })
    // }

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
    // const langParam = searchParams.get('lang') || 'en-US'
    const search = searchParams.get('search')
    const country = searchParams.get('country')
    const userId = searchParams.get('userId')

    // Common select fields
    const selectFields = {
      id: recipes.id,
      user_id: recipes.user_id,
      grandmotherTitle: recipes.grandmotherTitle,
      firstName: recipes.firstName,
      lastName: recipes.lastName,
      country: recipes.country,
      region: recipes.region,
      photo: recipes.photo,
      recipe_image: recipes.recipe_image,
      dish_image: recipes.dish_image,
      recipeTitle: recipes.recipeTitle,
      release_signature: recipes.release_signature,
      published: recipes.published,
      createdAt: recipes.createdAt,
      traditions: recipes.traditions,
      history: recipes.history,
      geo_history: recipes.geo_history,
      recipe: recipes.recipe,
      directions: recipes.directions,
      influences: recipes.influences,
    }

    let result

    if (idParam) {
      // Get specific recipe by ID
      result = await db
        .select(selectFields)
        .from(recipes)
        .where(eq(recipes.id, Number(idParam)))
        .orderBy(recipes.recipeTitle)
    } else {
      // Build where conditions based on search and country parameters
      const whereConditions = []

      // Handle published filter
      let published: boolean | undefined = undefined
      if (publishedParam === 'true') published = true
      if (publishedParam === 'false') published = false
      if (published !== undefined) {
        whereConditions.push(eq(recipes.published, published))
      }

      // Handle search filter
      if (search) {
        whereConditions.push(
          sql`${recipes.search_vector} @@ plainto_tsquery('simple', ${search})`
        )
      }

      // Handle country filter
      if (country) {
        whereConditions.push(ilike(recipes.country, `%${country}%`))
      }

      // Handle userId filter
      if (userId) {
        whereConditions.push(eq(recipes.user_id, userId))
      }

      const savedByUserId = searchParams.get('savedByUserId')

      // Handle savedByUserId filter (My Saved Recipes)
      if (savedByUserId) {
        // First get all recipe IDs liked by this user
        const likedRecipeIds = await db
          .select({ recipeId: likes.likeable_id })
          .from(likes)
          .where(and(
            eq(likes.user_id, savedByUserId),
            eq(likes.likeable_type, 'recipe')
          ))

        const ids = likedRecipeIds.map(l => l.recipeId)

        if (ids.length > 0) {
          whereConditions.push(inArray(recipes.id, ids))
        } else {
          // User has no saved recipes, return empty result
          // We push a condition that is always false to return empty
          whereConditions.push(eq(recipes.id, -1))
        }
      }

      // Build and execute the query based on conditions
      if (whereConditions.length === 0) {
        // No filters - get all recipes
        result = await db
          .select(selectFields)
          .from(recipes)
          .orderBy(recipes.recipeTitle)
      } else {
        // Apply all conditions
        const orderBy =
          published !== undefined && !search && !country && !savedByUserId
            ? sql`RANDOM()`
            : recipes.recipeTitle

        result = await db
          .select(selectFields)
          .from(recipes)
          .where(and(...whereConditions))
          .orderBy(orderBy)
      }
    }

    return NextResponse.json({ recipes: result })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, published } = body
    if (typeof id !== 'number' || typeof published !== 'boolean') {
      return NextResponse.json(
        { message: 'Invalid id or published value' },
        { status: 400 }
      )
    }

    // Content Moderation for Updates
    const contentToCheck = [
      body.grandmotherTitle,
      body.firstName,
      body.lastName,
      body.recipeTitle,
      body.history,
      body.geo_history,
      body.recipe,
      body.directions,
      body.influences,
      body.traditions
    ].filter(Boolean).join('\n');

    if (contentToCheck) {
      const isFlagged = await moderateContent(contentToCheck);
      if (isFlagged) {
        return NextResponse.json(
          { message: 'Content flagged as inappropriate.' },
          { status: 400 }
        )
      }
    }

    const updatedRecipe = {
      published,
      ...(body.grandmotherTitle && { grandmotherTitle: body.grandmotherTitle }),
      ...(body.firstName && { firstName: body.firstName }),
      ...(body.lastName && { lastName: body.lastName }),
      ...(body.recipeTitle && { recipeTitle: body.recipeTitle }),
      ...(body.country && { country: body.country }),
      ...(body.region && { region: body.region }),
      ...(body.history && { history: body.history }),
      ...(body.geo_history && { geo_history: body.geo_history }),
      ...(body.recipe && { recipe: body.recipe }),
      ...(body.directions && { directions: body.directions }),
      ...(body.influences && { influences: body.influences }),
      ...(body.traditions && { traditions: body.traditions }),
      ...(body.photo && { photo: body.photo }),
      ...(body.recipe_image && { recipe_image: body.recipe_image }),
      ...(body.dish_image && { dish_image: body.dish_image }),
      ...(body.release_signature && {
        release_signature: body.release_signature,
      }),
    }
    const updated = await db
      .update(recipes)
      .set(updatedRecipe)
      .where(eq(recipes.id, id))
      .returning()
    if (!updated.length) {
      return NextResponse.json({ message: 'Recipe not found' }, { status: 404 })
    }
    return NextResponse.json({ recipe: updated[0] })
  } catch (error) {
    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')

    if (!idParam) {
      return NextResponse.json(
        { message: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    const id = Number(idParam)
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'Invalid recipe ID' },
        { status: 400 }
      )
    }

    // Check if recipe exists before deleting
    const existingRecipe = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(eq(recipes.id, id))

    if (!existingRecipe.length) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Delete the recipe
    const deletedRecipe = await db
      .delete(recipes)
      .where(eq(recipes.id, id))
      .returning()

    return NextResponse.json({
      message: 'Recipe deleted successfully',
      recipe: deletedRecipe[0],
    })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
