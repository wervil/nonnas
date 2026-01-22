'use client'
import React, { useEffect, useState } from 'react'
import { useForm, FieldValues } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'

import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import CountryRegionSelector from '@/components/ui/CountryRegionSelector'
import { TextEditor } from '@/components/ui/TextEditor'
import FileUpload from '@/components/ui/FileUpload'
import { sanitizeHtml } from '@/utils/utils'
import { allCountries } from 'country-region-data'
import { Typography } from './ui/Typography'
import Textarea from './ui/Textarea'
import { Recipe } from '@/db/schema'

// Helper function to strip HTML tags and get text content
const getTextContent = (html: string): string => {
  if (typeof window === 'undefined') return html // Server-side fallback
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

const recipeSchema = z.object({
  grandmotherTitle: z.string().min(1, 'Grandmother Title is required').max(80, 'Grandmother Title must be 80 characters or less').regex(/^[^0-9]*$/, 'Grandmother Title cannot contain numbers'),
  firstName: z.string().min(1, 'First Name is required').max(60, 'First Name must be 60 characters or less').regex(/^[^0-9]*$/, 'First Name cannot contain numbers'),
  lastName: z.string().min(1, 'Last Name is required').max(60, 'Last Name must be 60 characters or less').regex(/^[^0-9]*$/, 'Last Name cannot contain numbers'),
  country: z.string().min(1, 'Country is required'),
  history: z.string().min(1, 'Biography is required').max(700, 'Biography must be 700 characters or less'),
  recipeTitle: z.string().min(1, 'Recipe Title is required').max(80, 'Recipe Title must be 80 characters or less').regex(/^[^0-9]*$/, 'Recipe Title cannot contain numbers'),
  recipe: z.string().min(1, 'Ingredients are required').refine((val) => getTextContent(val).length <= 1000, {
    message: 'Ingredients must be 1000 characters or less',
  }),
  directions: z.string().min(1, 'Directions are required').refine((val) => getTextContent(val).length <= 500, {
    message: 'Directions must be 500 characters or less',
  }),
  region: z.string().min(1, 'Region is required'),
  traditions: z.string().min(1, 'Traditions is required').max(500, 'Traditions must be 500 characters or less'),
  geo_history: z.string().min(1, 'Regional History is required').max(600, 'Regional History must be 600 characters or less'),
  influences: z.string().min(1, 'Influences is required').max(400, 'Influences must be 400 characters or less'),
  photo: z.any().refine((val) => val && val.length > 0, {
    message: 'Photo of your Grandmother is required',
  }),
  recipe_image: z.any().refine((val) => val && val.length > 0, {
    message: 'Recipe Photo is required',
  }),
  dish_image: z.any().optional(),
  userId: z.string().optional(),
  release_signature: z
    .boolean()
    .default(true)
    .refine((val) => val === true, {
      message: 'You must agree to release your signature',
    }),
})

export const AddRecipe = ({
  userId,
  recipe,
}: {
  userId?: string
  recipe?: Recipe
}) => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const b = useTranslations('buttons')
  const l = useTranslations('labels')
  const d = useTranslations('descriptions')

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      grandmotherTitle: '',
      firstName: '',
      traditions: '',
      lastName: '',
      country: '',
      region: '',
      history: '',
      geo_history: '',
      recipeTitle: '',
      recipe: '',
      directions: '',
      influences: '',
      photo: [],
      recipe_image: [],
      dish_image: [],
      release_signature: false,
      userId: userId || '',
    },
    resolver: zodResolver(recipeSchema),
  })

  useEffect(() => {
    if (recipe) {
      reset({
        grandmotherTitle: recipe.grandmotherTitle,
        firstName: recipe.firstName,
        lastName: recipe.lastName,
        recipeTitle: recipe.recipeTitle,
        country:
          allCountries.find((country) => country[1] === recipe.country)?.[0] ||
          recipe.country,
        region: recipe.region || '',
        history: sanitizeHtml(recipe.history),
        geo_history: sanitizeHtml(recipe.geo_history || ''),
        recipe: sanitizeHtml(recipe.recipe),
        directions: sanitizeHtml(recipe.directions),
        influences: sanitizeHtml(recipe.influences || ''),
        traditions: sanitizeHtml(recipe.traditions || ''),
        photo: recipe.photo || [],
        dish_image: recipe.dish_image || [],
        recipe_image: recipe.recipe_image || [],
        release_signature: recipe.release_signature || false,
        userId,
      })
    }
  }, [recipe, reset, userId])

  const onSubmit = async (data: FieldValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Sanitize HTML content
      const sanitizedData = {
        grandmotherTitle: data.grandmotherTitle,
        firstName: data.firstName,
        lastName: data.lastName,
        recipeTitle: data.recipeTitle,
        country:
          allCountries.find((country) => country[1] === data.country)?.[0] ||
          data.country,
        region: data.region || null,
        history: sanitizeHtml(data.history),
        geo_history: sanitizeHtml(data.geo_history),
        recipe: sanitizeHtml(data.recipe),
        directions: sanitizeHtml(data.directions),
        influences: sanitizeHtml(data.influences),
        traditions: sanitizeHtml(data.traditions),
        photo: data.photo || [],
        dish_image: data.dish_image || [],
        recipe_image: data.recipe_image || [],
        release_signature: data.release_signature || false,
        user_id: data.userId,
      }

      const response = recipe
        ? await fetch('/api/recipes', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...sanitizedData,
            id: recipe.id,
            published: recipe.published,
          }),
        })
        : await fetch('/api/recipes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sanitizedData),
        })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save recipe')
      }

      // Redirect to the recipe list page or show success message
      router.push(recipe ? `/profile/${recipe.id}` : '/')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while saving the recipe')
      }
      console.error('Error saving recipe:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-5 max-w-6xl mx-auto z-10">
      {error ? <Typography color="dangerMain">{error}</Typography> : null}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col md:flex-row"
      >
        <div className="bg-brown-pale p-6 rounded-tl-3xl rounded-tr-3xl md:rounded-bl-3xl md:rounded-tr-none flex flex-col gap-5 w-full">
          <Input
            label={`${l('grandmotherTitle')}*`}
            name="grandmotherTitle"
            control={control}
            description={d('grandmotherDesc')}
            error={errors.grandmotherTitle?.message}
            maxLength={80}
          />
          <div className="flex w-full gap-5">
            <Input
              label={`${l('firstName')}*`}
              name="firstName"
              control={control}
              error={errors.firstName?.message}
              maxLength={60}
            />
            <Input
              label={`${l('lastName')}*`}
              name="lastName"
              control={control}
              error={errors.lastName?.message}
              maxLength={60}
            />
          </div>
          <div>
            <CountryRegionSelector
              countryName="country"
              regionName="region"
              control={control}
              label={l('location')}
            />
          </div>
          <FileUpload
            label={`${l('photo')}*`}
            description={d('photoDesc')}
            name="photo"
            control={control}
            maxFiles={5}
            setValue={setValue}
            watch={watch}
          />
          <FileUpload
            label={`${l('recipeImage')}*`}
            description={d('recipeImage')}
            name="recipe_image"
            control={control}
            maxFiles={1}
            setValue={setValue}
            watch={watch}
          />
          <Textarea
            label={`${l('bio')}*`}
            description={d('bio')}
            name="history"
            control={control}
            error={errors.history?.message}
            maxLength={700}
          />
          <Textarea
            label={`${l('geoHistory')}*`}
            description={d('geoHistory')}
            name="geo_history"
            control={control}
            error={errors.geo_history?.message}
            maxLength={600}
          />
        </div>
        <div className="bg-primary-hover p-6 rounded-bl-3xl rounded-br-3xl md:rounded-tr-3xl md:rounded-bl-none flex flex-col gap-5 w-full">
          <Input
            label={`${l('recipeTitle')}*`}
            name="recipeTitle"
            control={control}
            error={errors.recipeTitle?.message}
            theme="light"
            maxLength={80}
          />
          <TextEditor
            title={`${l('ingredients')}*`}
            description={d('ingredientsDesc')}
            name="recipe"
            control={control}
            theme="light"
            maxLength={1000}
          />
          <TextEditor
            title={`${l('directions')}*`}
            description={d('directionsDesc')}
            name="directions"
            control={control}
            theme="light"
            maxLength={500}
          />

          <Textarea
            label={`${l('traditions')}*`}
            description={d('traditions')}
            name="traditions"
            control={control}
            theme="light"
            maxLength={500}
          />
          <Textarea
            label={`${l('influences')}*`}
            description={d('influences')}
            name="influences"
            control={control}
            theme="light"
            maxLength={400}
          />
          <Checkbox
            label={
              <Typography
                as="label"
                htmlFor="release_signature"
                size="bodyXS"
                color="primaryFocus"
                className="mt-2 cursor-pointer"
              >
                {l('releaseSignature')}
                <a
                  href="/terms-of-use"
                  target="_blank"
                >
                  {l('termsAndConditions')}
                </a>
              </Typography>
            }
            name="release_signature"
            control={control}
            description={d('releaseSignature')}
            theme="light"
          />
          <div className="flex justify-end mt-4">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? b('submitting') : b('submit')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
