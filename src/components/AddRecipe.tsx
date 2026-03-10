'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import Button from '@/components/ui/Button'
import Checkbox from '@/components/ui/Checkbox'
import FileUpload from '@/components/ui/FileUpload'
import Input from '@/components/ui/Input'
import { TextEditor } from '@/components/ui/TextEditor'
import { Recipe } from '@/db/schema'
import { sanitizeHtml } from '@/utils/utils'
import { allCountries } from 'country-region-data'
import CountryStateCitySelector from './ui/CountryStateCitySelector'
import Textarea from './ui/Textarea'
import { Typography } from './ui/Typography'

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
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  coordinates: z.string().optional(),
  history: z.string().min(1, 'Biography is required').max(700, 'Biography must be 700 characters or less'),
  recipeTitle: z.string().min(1, 'Recipe Title is required').max(80, 'Recipe Title must be 80 characters or less').regex(/^[^0-9]*$/, 'Recipe Title cannot contain numbers'),
  recipe: z.string().min(1, 'Ingredients are required').refine((val) => getTextContent(val).length <= 1000, {
    message: 'Ingredients must be 1000 characters or less',
  }),
  directions: z.string().min(1, 'Directions are required').refine((val) => getTextContent(val).length <= 500, {
    message: 'Directions must be 500 characters or less',
  }),
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
  avatar_image: z.string().optional(),
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
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(recipe?.avatar_image || null)
  const lastGeneratedSource = React.useRef<string | null>(null)
  const b = useTranslations('buttons')
  const l = useTranslations('labels')
  const d = useTranslations('descriptions')

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      grandmotherTitle: '',
      firstName: '',
      traditions: '',
      lastName: '',
      country: '',
      state: '',
      city: '',
      coordinates: '',
      history: '',
      geo_history: '',
      recipeTitle: '',
      recipe: '',
      directions: '',
      influences: '',
      photo: [],
      recipe_image: [],
      dish_image: [],
      avatar_image: '',
      release_signature: false,
      userId: userId || '',
    },
    resolver: zodResolver(recipeSchema),
  })

  // Steps configuration
  const steps = [
    {
      id: 'identity',
      title: l('grandmotherTitle'), // Using existing label as title roughly fitting
      fields: ['grandmotherTitle', 'firstName', 'lastName', 'country', 'state', 'city', 'coordinates'],
      description: 'Tell us about your grandmother.'
    },
    {
      id: 'story',
      title: 'Her Story',
      fields: ['history', 'geo_history'],
      description: d('bio')
    },
    {
      id: 'recipe',
      title: 'The Recipe',
      fields: ['recipeTitle', 'recipe', 'directions'],
      description: 'Details of the dish.'
    },
    {
      id: 'culture',
      title: l('traditions'),
      fields: ['traditions', 'influences'],
      description: 'Cultural background and influences.'
    },
    {
      id: 'media',
      title: 'Media & Review',
      fields: ['photo', 'recipe_image', 'release_signature'],
      description: 'Upload photos and review.'
    }
  ]

  const [currentStep, setCurrentStep] = useState(0)

  const uploadedPhoto = watch('photo')

  // useEffect(() => {
  //   const handleAvatarGen = async () => {
  //     if (uploadedPhoto && uploadedPhoto.length > 0) {
  //       const sourceUrl = uploadedPhoto[0];
  //       // Ensure sourceUrl is a string (e.g. from Vercel Blob) and not just a File object right away
  //       // If it's a blob url or remote url
  //       if (typeof sourceUrl === 'string' && sourceUrl !== lastGeneratedSource.current) {
  //         try {
  //           setIsGeneratingAvatar(true)
  //           const response = await fetch('/api/avatar/generate', {
  //             method: 'POST',
  //             headers: { 'Content-Type': 'application/json' },
  //             body: JSON.stringify({ imageUrl: sourceUrl }),
  //           })
  //           if (response.ok) {
  //             const data = await response.json()
  //             if (data.avatarUrl) {
  //               setAvatarUrl(data.avatarUrl)
  //               lastGeneratedSource.current = sourceUrl
  //             }
  //           }
  //         } catch (e) {
  //           console.error('Error generating avatar', e)
  //         } finally {
  //           setIsGeneratingAvatar(false)
  //         }
  //       }
  //     }
  //   }
  //   handleAvatarGen()
  // }, [uploadedPhoto])

  useEffect(() => {
    const handleAvatarGen = async () => {
      if (!uploadedPhoto?.length) return;

      const sourceUrl = uploadedPhoto[0];

      if (typeof sourceUrl !== "string") return;
      if (sourceUrl === lastGeneratedSource.current) return;

      try {
        setIsGeneratingAvatar(true);

        const response = await fetch("/api/avatar/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input_image: sourceUrl, // ✅ match API key
            prompt: "Make this a 90s cartoon avatar, clean outlines, vibrant colors",
            output_format: "jpg",
          }),
        });

        const data = await response.json();

        // ✅ accept either "url" or "avatarUrl"
        const avatarUrl = data?.avatarUrl ?? data?.url;

        if (response.ok && avatarUrl) {
          setAvatarUrl(avatarUrl);
          lastGeneratedSource.current = sourceUrl;
        } else {
          console.error("Avatar API failed:", data);
        }
      } catch (e) {
        console.error("Error generating avatar", e);
      } finally {
        setIsGeneratingAvatar(false);
      }
    };

    handleAvatarGen();
  }, [uploadedPhoto]);

  const nextStep = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
    }
    const fields = steps[currentStep].fields
    const isValid = await trigger(fields as any)
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
      window.scrollTo(0, 0)
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    if (recipe) {
      reset({
        grandmotherTitle: recipe.grandmotherTitle,
        firstName: recipe.firstName,
        lastName: recipe.lastName,
        recipeTitle: recipe.recipeTitle,
        country:
          allCountries.find((country) => country[0] === recipe.country || country[1] === recipe.country)?.[1] ||
          recipe.country,
        state: recipe.region || '',
        city: recipe.city || '',
        coordinates: recipe.coordinates || '',
        history: sanitizeHtml(recipe.history),
        geo_history: sanitizeHtml(recipe.geo_history || ''),
        recipe: sanitizeHtml(recipe.recipe),
        directions: sanitizeHtml(recipe.directions),
        influences: sanitizeHtml(recipe.influences || ''),
        traditions: sanitizeHtml(recipe.traditions || ''),
        photo: recipe.photo || [],
        dish_image: recipe.dish_image || [],
        recipe_image: recipe.recipe_image || [],
        avatar_image: recipe.avatar_image || '',
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
        state: data.state || null,
        city: data.city || null,
        coordinates: data.coordinates || null,
        history: sanitizeHtml(data.history),
        geo_history: sanitizeHtml(data.geo_history),
        recipe: sanitizeHtml(data.recipe),
        directions: sanitizeHtml(data.directions),
        influences: sanitizeHtml(data.influences),
        traditions: sanitizeHtml(data.traditions),
        photo: data.photo || [],
        dish_image: data.dish_image || [],
        recipe_image: data.recipe_image || [],
        avatar_image: avatarUrl || data.avatar_image || null,
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

        // Handle moderation/validation errors gracefully
        if (response.status === 400) {
          toast.error(errorData.message || 'Invalid request')
          setIsSubmitting(false)
          return
        }

        throw new Error(errorData.message || 'Failed to save recipe')
      }

      // Redirect to the recipe list page or show success message
      router.push(recipe ? `/profile/${recipe.id}` : '/')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while saving the recipe')
        toast.error(err.message || 'An error occurred while saving the recipe')
      }
      console.error('Error saving recipe:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-5 sm:w-full md:w-[500px] lg:w-[700px] mx-auto z-10 min-h-[600px]">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Typography size="h3" as="h3" className="text-brown-pale/70 drop-shadow-md">{steps[currentStep].title}</Typography>
          <Typography size="body" className="text-brown-pale/70 drop-shadow-md">Step {currentStep + 1} of {steps.length}</Typography>
        </div>
        <div className="h-2 w-full bg-white/30 rounded-full backdrop-blur-sm">
          <div
            className="h-full bg-brown-pale/30 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
        <Typography className="mt-2 text-brown-pale/70 drop-shadow-sm">{steps[currentStep].description}</Typography>
      </div>

      {error ? <Typography color="dangerMain" className="mb-4 bg-white/90 p-2 rounded-md">{error}</Typography> : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="bg-brown-pale p-6 md:p-8 rounded-3xl shadow-xl border border-primary-border/20">

          {/* Step 1: Identity */}
          {currentStep === 0 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <Input
                label={`${l('grandmotherTitle')}*`}
                name="grandmotherTitle"
                control={control}
                description={d('grandmotherDesc')}
                error={errors.grandmotherTitle?.message}
                maxLength={80}
              />
              <div className="flex flex-row gap-5">
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

              <CountryStateCitySelector
                countryName="country"
                stateName="state"
                cityName="city"
                coordinatesName="coordinates"
                control={control}
                setValue={setValue}
              />
            </div>
          )}

          {/* Step 2: Story */}
          {currentStep === 1 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
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
          )}

          {/* Step 3: Recipe */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <Input
                label={`${l('recipeTitle')}*`}
                name="recipeTitle"
                control={control}
                error={errors.recipeTitle?.message}
                maxLength={80}
              />
              <TextEditor
                title={`${l('ingredients')}*`}
                description={d('ingredientsDesc')}
                name="recipe"
                control={control}
                maxLength={1000}
              />
              <TextEditor
                title={`${l('directions')}*`}
                description={d('directionsDesc')}
                name="directions"
                control={control}
                maxLength={500}
              />
            </div>
          )}

          {/* Step 4: Culture */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <Textarea
                label={`${l('traditions')}*`}
                description={d('traditions')}
                name="traditions"
                control={control}
                maxLength={500}
              />
              <Textarea
                label={`${l('influences')}*`}
                description={d('influences')}
                name="influences"
                control={control}
                maxLength={400}
              />
            </div>
          )}

          {/* Step 5: Media */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <FileUpload
                label={`${l('photo')}*`}
                description={d('photoDesc')}
                name="photo"
                control={control}
                maxFiles={5}
                setValue={setValue}
                watch={watch}
              />

              {/* AI Avatar Display Section */}
              {(isGeneratingAvatar || avatarUrl) && (
                <div className="flex flex-col gap-2 p-4 bg-white/50 rounded-xl border border-primary-border/20">
                  <Typography size="body" className="font-semibold text-brown-dark">
                    Generated Avatar
                  </Typography>
                  <Typography size="bodyXS" className="text-brown-pale/80 mb-2">
                    {isGeneratingAvatar ? 'Generating your 3D Pixar style avatar...' : 'This beautiful 3D avatar was created automatically for the 3D map!'}
                  </Typography>
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl flex items-center justify-center bg-gray-100/50 backdrop-blur-md">
                    {isGeneratingAvatar ? (
                      <Loader2 className="w-8 h-8 animate-spin text-brown-pale" />
                    ) : avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="AI Generated Avatar"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                </div>
              )}

              <FileUpload
                label={`${l('recipeImage')}*`}
                description={d('recipeImage')}
                name="recipe_image"
                control={control}
                maxFiles={1}
                setValue={setValue}
                watch={watch}
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
              />
            </div>
          )}
        </div>

        <div className="flex justify-between mt-4 px-2">
          <Button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0 || isSubmitting}
            className={`transition-opacity ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            {b('prevPage')}
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="button" variant="primary" onClick={nextStep}>
              {b('nextPage')}
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? b('submitting') : b('submit')}
            </Button>
          )}
        </div>
      </form >
    </div >
  )
}
