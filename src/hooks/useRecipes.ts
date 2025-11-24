import { useEffect, useState, useRef } from 'react'
import { sanitizeHtml } from '@/utils/utils'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'

export const MAX_RECIPES_PER_PAGE = 14

const convertRecipe = (recipe: Recipe) => ({
  ...recipe,
  history: sanitizeHtml(recipe.history || ''),
  geo_history: sanitizeHtml(recipe.geo_history || ''),
  recipe: sanitizeHtml(recipe.recipe || ''),
  directions: sanitizeHtml(recipe.directions || ''),
  influences: sanitizeHtml(recipe.influences || ''),
  traditions: sanitizeHtml(recipe.traditions || ''),
})

export const useRecipes = () => {
  const n = useTranslations('navigation')
  const [selectedCountry, setSelectedCountry] = useState<{
    label: string
    value: string
  }>({ value: '', label: n('all') })
  const [search, setSearch] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [tableOfContents, setTableOfContents] = useState<
    Record<string, Recipe[]>
  >({})
  const [lang] = useState('en-US')
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const fetchRecipes = async (
    lang: string,
    search: string,
    country: string
  ) => {
    setLoading(true)
    let url = `/api/recipes?published=true&lang=${lang}`
    if (search) {
      url += `&search=${encodeURIComponent(search)}`
    }
    if (!!country) {
      url += `&country=${encodeURIComponent(country)}`
    }

    const res = await fetch(url)
    const data = await res.json()

    if (Array.isArray(data.recipes)) {
      const convertedRecipes = data.recipes.map(convertRecipe)
      setRecipes(convertedRecipes)
    } else {
      const sortedRecipes: Record<string, Recipe[]> = Object.keys(data.recipes)
        .sort()
        .reduce((acc, key) => {
          acc[key] = data.recipes[key]
          return acc
        }, {} as Record<string, Recipe[]>)

      setTableOfContents(sortedRecipes)

      const allRecipes = Object.values(sortedRecipes).flat() as Recipe[]
      const convertedRecipes = allRecipes.map(convertRecipe)

      setRecipes(convertedRecipes)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchRecipes(lang, search, selectedCountry.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchRecipes(lang, search, selectedCountry.value)
    }, 400)
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCountry.value])

  return {
    loading,
    recipes,
    tableOfContents,
    selectedCountry,
    setSelectedCountry,
    search,
    setSearch,
  }
}
