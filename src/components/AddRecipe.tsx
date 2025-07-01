'use client'
import React, { useState } from 'react'
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
import Link from 'next/link'
import { CheckoutButton } from '@/components/CheckoutButton'
import { allCountries } from 'country-region-data'

const recipeSchema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
  country: z.string().min(1, 'Country is required'),
  history: z.string().min(1, 'History is required'),
  recipe: z.string().min(1, 'Recipe is required'),
  region: z.string().optional(),
  geo_history: z.string().optional(),
  influences: z.string().optional(),
  photo: z.any().optional(),
  recipe_image: z.any().optional(),
  dish_image: z.any().optional(),
  release_signature: z.literal(true, { errorMap: () => ({ message: 'You must agree to release your signature' }) }),
})

export const AddRecipe = ({ userId }: { userId: string }) => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const b = useTranslations('buttons')
  const l = useTranslations('labels')
  const d = useTranslations('descriptions')

  const { handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      fullName: '',
      country: '',
      region: '',
      history: '',
      geo_history: '',
      recipe: '',
      influences: '',
      photo: [],
      recipe_image: [],
      dish_image: [],
      release_signature: false,
    },
    resolver: zodResolver(recipeSchema),
  })

  const onSubmit = async (data: FieldValues) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Sanitize HTML content
      const sanitizedData = {
        fullName: data.fullName,
        user_id: userId,
        country: allCountries.find((country) => country[1] === data.country)?.[0] || data.country,
        region: data.region || null,
        history: sanitizeHtml(data.history),
        geo_history: sanitizeHtml(data.geo_history),
        recipe: sanitizeHtml(data.recipe),
        influences: sanitizeHtml(data.influences),
        photo: data.photo || [],
        dish_image: data.dish_image || [],
        recipe_image: data.recipe_image || [],
        release_signature: data.release_signature || false,
      }

      const response = await fetch('/api/recipes', {
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
      router.push('/') // You can change this to redirect to another page
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
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-6">{b('addRecipe')}</h1>
        <CheckoutButton />
        <Link href="/recipes">
          <Button variant="secondary">{b('goToRecipes')}</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label={l('fullName')}
          name="fullName"
          description={d('fullName')}
          control={control}
        />
        {errors.fullName && <div className="text-red-500 text-sm mb-2">{errors.fullName.message as string}</div>}

        <CountryRegionSelector
          countryName="country"
          regionName="region"
          control={control}
          label={l('location')}
          description={d('location')}
        />
        {errors.country && <div className="text-red-500 text-sm mb-2">{errors.country.message as string}</div>}

        <FileUpload
          label={l('photo')}
          name="photo"
          control={control}
          maxFiles={4}
        />

        <TextEditor title={l('bio')} name="history" control={control} />
        {errors.history && <div className="text-red-500 text-sm mb-2">{errors.history.message as string}</div>}

        <TextEditor title={l('geoHistory')} name="geo_history" control={control} />
        <FileUpload
          label={l('dishImage')}
          name="dish_image"
          control={control}
          maxFiles={1}
        />

        <FileUpload
          label={l('recipeImage')}
          name="recipe_image"
          control={control}
          maxFiles={1}
        />

        <TextEditor title={l('recipe')} name="recipe" control={control} />
        {errors.recipe && <div className="text-red-500 text-sm mb-2">{errors.recipe.message as string}</div>}

        <TextEditor title={l('influences')} name="influences" control={control} />

        <Checkbox
          label={l('releaseSignature')}
          name="release_signature"
          control={control}
          description={d('releaseSignature')}
        />

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? b('submitting') : b('submit')}
        </Button>
      </form>
    </div>
  )
}
