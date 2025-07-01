'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'

const fetchRecipes = async (published: boolean) => {
  const res = await fetch(`/api/recipes?published=${published}`)
  const data = await res.json()
  return data.recipes
}

export default function Dashboard() {
  const [tab, setTab] = useState<'new' | 'published'>('new')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const l = useTranslations('labels')
  const d = useTranslations('descriptions')
  const b = useTranslations('buttons')

  const loadRecipes = async () => {
    setLoading(true)
    const data = await fetchRecipes(tab === 'published')
    setRecipes(data)
    setLoading(false)
  }

  useEffect(() => {
    loadRecipes()
    // eslint-disable-next-line
  }, [tab])

  const togglePublished = async (id: number, published: boolean) => {
    await fetch('/api/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, published }),
    })
    loadRecipes()
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{l('dashboard')}</h1>
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            tab === 'new' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setTab('new')}
        >
          {d('newRecipes')}
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tab === 'published' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setTab('published')}
        >
          {d('publishedRecipes')}
        </button>
      </div>
      {loading ? (
        <div>{b('loading')}</div>
      ) : (
        <ul className="space-y-4">
          {recipes.length === 0 && <li>{d('noRecipesFound')}</li>}
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="border p-4 rounded flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{recipe.fullName}</div>
                <div className="text-sm text-gray-500">
                  {recipe.country}
                  {recipe.region ? `, ${recipe.region}` : ''}
                </div>
                <Link
                  href={`/dashboard/${recipe.id}`}
                  className="text-blue-600 underline text-sm"
                >
                  {b('viewDetails')}
                </Link>
              </div>
              <button
                className={`px-3 py-1 rounded ${
                  recipe.published
                    ? 'bg-yellow-500 text-white'
                    : 'bg-green-500 text-white'
                }`}
                onClick={() => togglePublished(recipe.id, !recipe.published)}
              >
                {recipe.published ? b('unpublish') : b('publish')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
