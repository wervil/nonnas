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
  const [recipes, setRecipes] = useState<Recipe[]>([]) // These are now ALL recipes
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]) // These are subsets
  const [loading, setLoading] = useState(true)
  const [tableOfContents, setTableOfContents] = useState<
    Record<string, Recipe[]>
  >({})
  const [lang] = useState('en-US')

  // Fetch all recipes once
  const fetchRecipes = async (lang: string) => {
    setLoading(true)
    const url = `/api/recipes?published=true&lang=${lang}`

    try {
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
    } catch (error) {
      console.error("Failed to fetch recipes", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter recipes when search or country changes
  useEffect(() => {
    let result = recipes

    if (search) {
      const lowerSearch = search.toLowerCase()
      result = result.filter(r =>
        r.recipeTitle.toLowerCase().includes(lowerSearch) ||
        r.firstName.toLowerCase().includes(lowerSearch) ||
        r.lastName.toLowerCase().includes(lowerSearch) ||
        (r.grandmotherTitle && r.grandmotherTitle.toLowerCase().includes(lowerSearch))
      )
    }

    if (selectedCountry.value) {
      result = result.filter(r => r.country === selectedCountry.value)
    }

    setFilteredRecipes(result)
  }, [recipes, search, selectedCountry])

  useEffect(() => {
    fetchRecipes(lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // NOTE: Removed the debounce search fetch because we filter client side now.

  return {
    loading,
    recipes, // Passing ALL recipes to the book
    filteredRecipes, // Passing filtered recipes to the modal
    tableOfContents,
    selectedCountry,
    setSelectedCountry,
    search,
    setSearch,
  }
}
