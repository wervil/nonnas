'use client'

import { useEffect, useState } from 'react'
import { Recipe } from '@/db/schema'
import { sanitizeHtml } from '@/utils/utils'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { convertRecipesToHTML } from '@/app/(admin)/print/convertRecipesToHTML'
import './styles.css'
import Link from 'next/link'

async function fetchRecipe(id: string) {
  const res = await fetch(`/api/recipes?id=${id}`)
  const data = await res.json()
  return data.recipes?.[0]
}

export const DashboardRecipe = ({
  id,
  hasAdminAccess,
}: {
  id: string
  hasAdminAccess: boolean
}) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const b = useTranslations('buttons')
  const d = useTranslations('descriptions')
  const l = useTranslations('labels')
  const router = useRouter()

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

  const deleteRecipe = async (recipeId: string) => {
    await fetch(`/api/recipes?id=${recipeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (loading) return <div className="p-4">{b('loading')}</div>
  if (!recipe) return <div className="p-4">{d('noRecipesFound')}</div>

  const sanitizedRecipe = {
    ...recipe,
    history: sanitizeHtml(recipe.history || ''),
    geo_history: sanitizeHtml(recipe.geo_history || ''),
    recipe: sanitizeHtml(recipe.recipe || ''),
    directions: sanitizeHtml(recipe.directions || ''),
    influences: sanitizeHtml(recipe.influences || ''),
  }

  const goBack = () => {
    router.back()
  }

  return (
    <div className="w-full mx-auto">
      <div className="flex gap-4 p-4 action-buttons">
        <Button onClick={goBack}>{b('goBack')}</Button>
        <div className="mb-2">
          <b>{l('published')}:</b>{' '}
          {sanitizedRecipe.published ? d('yes') : d('no')}
        </div>
        {hasAdminAccess ? (
          <>
            <button
              className={`px-4 py-2 rounded cursor-pointer ${
                sanitizedRecipe.published
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-white'
              }`}
              onClick={togglePublished}
            >
              {sanitizedRecipe.published ? b('unpublish') : b('publish')}
            </button>
            <Button onClick={() => window.print()}>{b('browserPrint')}</Button>
          </>
        ) : (
          <Link href={`${id}/edit`}>
            <Button>{b('edit')}</Button>
          </Link>
        )}
        <Button onClick={() => deleteRecipe(id)}>
          {b('delete')}
        </Button>
      </div>
      <div id="cookbook-content" className="w-fullpage">
        {convertRecipesToHTML([recipe], l)}
      </div>
    </div>
  )
}
