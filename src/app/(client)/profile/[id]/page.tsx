'use client'

import { RecipesList } from '@/components/RecipesList'
import Button from '@/components/ui/Button'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, ArrowLeft } from 'lucide-react'

// Fetch public recipes for this user
const fetchCreatorRecipes = async (userId: string) => {
  const res = await fetch(`/api/recipes?userId=${userId}&published=true`)
  const data = await res.json()
  return data.recipes
}

export default function CreatorProfile({ params }: { params: Promise<{ id: string }> }) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const b = useTranslations('buttons')

  useEffect(() => {
    params.then((p) => {
      setUserId(p.id)
      fetchCreatorRecipes(p.id)
        .then((data) => {
          setRecipes(data || [])
          setLoading(false)
        })
        .catch((err) => {
          console.error(err)
          setLoading(false)
        })
    })
  }, [params])

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-10">
        <Link href="/" className="inline-flex items-center text-amber-400 mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {b('returnHome')}
        </Link>

        <div className="bg-gradient-to-r from-amber-900/40 to-black/40 p-8 rounded-2xl border border-white/10">
          <h1 className="text-3xl font-bold text-white mb-2">Creator Profile</h1>
          <p className="text-gray-400">Viewing recipes by this creator</p>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" /></div>
        ) : (
          <>
            {recipes.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center text-4xl">
                  👨‍🍳
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Published Recipes</h3>
                <p className="text-gray-500">This creator hasn't published any recipes yet.</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-6 pl-2 border-l-4 border-amber-500">
                  Published Recipes ({recipes.length})
                </h2>
                <RecipesList recipes={recipes} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
