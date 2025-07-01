'use client'

import { useEffect, useState } from 'react'
import { Recipe } from '@/db/schema'
import { sanitizeHtml } from '@/utils/utils'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

async function fetchRecipe(id: string) {
  const res = await fetch(`/api/recipes?id=${id}`)
  const data = await res.json()
  return data.recipes?.[0]
}

export const DashboardRecipe = ({ id }: { id: string }) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const b = useTranslations('buttons')
  const d = useTranslations('descriptions')
  const l = useTranslations('labels')

  useEffect(() => {
    fetchRecipe(id).then((data) => {
      setRecipe(data)
      setLoading(false)
    })
  }, [id])

  const togglePublished = async () => {
    if (!recipe) {
      return
    }
    await fetch('/api/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id), published: !recipe.published }),
    })
    setRecipe({ ...recipe, published: !recipe.published })
  }

  if (loading) return <div className="p-4">{b('loading')}</div>
  if (!recipe) return <div className="p-4">{d('noRecipesFound')}</div>

  const sanitizedRecipe = {
    ...recipe,
    history: sanitizeHtml(recipe.history || ''),
    geo_history: sanitizeHtml(recipe.geo_history || ''),
    recipe: sanitizeHtml(recipe.recipe || ''),
    influences: sanitizeHtml(recipe.influences || ''),
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Link href="/dashboard">
        <Button>{b('goBack')}</Button>
      </Link>
      <h1 className="text-2xl font-bold mb-2">{sanitizedRecipe.fullName}</h1>
      <div className="mb-2 text-gray-600">
        {sanitizedRecipe.country}
        {sanitizedRecipe.region ? `, ${sanitizedRecipe.region}` : ''}
      </div>
      <div className="relative w-[150px] h-[150px]">
        {' '}
        {sanitizedRecipe.photo?.map((image, index) => (
          <Image src={image} alt={recipe.fullName} key={index} fill />
        ))}
      </div>
      <div className="mb-2">
        <b>{l('bio')}:</b>
        <div
          className="pokemon-description"
          dangerouslySetInnerHTML={{ __html: sanitizedRecipe.history || '' }}
        ></div>
      </div>
      <div className="mb-2">
        <b>{l('geoHistory')}:</b>
        <div
          className="pokemon-description"
          dangerouslySetInnerHTML={{
            __html: sanitizedRecipe.geo_history || '',
          }}
        ></div>
      </div>
      {sanitizedRecipe.dish_image?.length ? (
        <div className="relative w-[150px] h-[150px]">
          {' '}
          {sanitizedRecipe.dish_image?.map((image, index) => (
            <Image
              src={image}
              alt={sanitizedRecipe.fullName}
              key={index}
              fill
            />
          ))}
        </div>
      ) : null}
      <div className="mb-2">
        <b>{l('recipe')}:</b>
        <div
          className="pokemon-description"
          dangerouslySetInnerHTML={{ __html: sanitizedRecipe.recipe || '' }}
        ></div>
      </div>
      <div className="mb-2">
        <b>{l('influences')}:</b>
        <div
          className="pokemon-description"
          dangerouslySetInnerHTML={{ __html: sanitizedRecipe.influences || '' }}
        ></div>
      </div>

      <div className="mb-2">
        <b>{l('published')}:</b>{' '}
        {sanitizedRecipe.published ? d('yes') : d('no')}
      </div>
      <button
        className={`px-4 py-2 rounded ${
          sanitizedRecipe.published
            ? 'bg-green-500 text-white'
            : 'bg-yellow-500 text-white'
        }`}
        onClick={togglePublished}
      >
        {sanitizedRecipe.published ? b('unpublish') : b('publish')}
      </button>
    </div>
  )
}
