'use client'
import { useEffect, useState, useRef } from 'react'
import { sanitizeHtml } from '@/utils/utils'
import { Book } from '@/components/Book/Book'
import { availableLanguages } from '@/utils/availableLanguages'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('en-US')
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const l = useTranslations('labels')
  const b = useTranslations('buttons')

  const fetchRecipes = async (lang: string, search: string) => {
    setLoading(true)
    let url = `/api/recipes?published=true&lang=${lang}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    const res = await fetch(url)
    const data = await res.json()
    setRecipes(
      data.recipes.map((recipe: Recipe) => ({
        ...recipe,
        history: sanitizeHtml(recipe.history || ''),
        geo_history: sanitizeHtml(recipe.geo_history || ''),
        recipe: sanitizeHtml(recipe.recipe || ''),
        influences: sanitizeHtml(recipe.influences || ''),
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchRecipes(lang, search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchRecipes(lang, search)
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div>
      <div className="flex justify-end items-center gap-2 py-4 px-8">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="border rounded px-2 py-1 w-full max-w-md"
        />
      </div>
      <div className="flex justify-end items-center gap-2 py-4 px-8">
        <label htmlFor="lang-select" className="font-medium">
          {l('language')}:
        </label>
        <select
          id="lang-select"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {availableLanguages.map((l) => (
            <option key={l.lang} value={l.lang}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      {loading ? <div>{b('loading')}</div> : <Book recipes={recipes} />}
    </div>
  )
}
