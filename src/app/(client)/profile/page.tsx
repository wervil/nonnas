'use client'

import { RecipesList } from '@/components/RecipesList'
import ThreadList from '@/components/Threads/ThreadList'
import Button from '@/components/ui/Button'
import { Recipe } from '@/db/schema'
import { useUser } from '@stackframe/stack'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, BookOpen, Heart, MessageCircle } from 'lucide-react'

// Add Activity type if needed, for now ThreadList handles fetching
export default function Profile() {
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'saved' | 'activity'>('my_recipes')
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const l = useTranslations('labels')
  const b = useTranslations('buttons')
  const user = useUser()

  useEffect(() => {
    if (user) {
      if (activeTab === 'my_recipes') {
        loadMyRecipes(user.id)
      } else if (activeTab === 'saved') {
        loadSavedRecipes(user.id)
      }
      // activity is handled by ThreadList internal fetching with props
    }
  }, [user, activeTab])

  const loadMyRecipes = async (userId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recipes?userId=${userId}`)
      const data = await res.json()
      setMyRecipes(data.recipes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedRecipes = async (userId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recipes?savedByUserId=${userId}`)
      const data = await res.json()
      setSavedRecipes(data.recipes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{user.displayName || 'Profile'}</h1>
          <p className="text-gray-400">Manage your recipes and activity</p>
        </div>
        <div className="flex gap-3">
          <Link href="/">
            <Button variant="outline">{b('returnHome')}</Button>
          </Link>
          <Button onClick={() => user?.signOut()} variant="outline">{b('logOut')}</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('my_recipes')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === 'my_recipes' ? 'text-amber-400' : 'text-gray-400 hover:text-white'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          My Recipes
          {activeTab === 'my_recipes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === 'saved' ? 'text-amber-400' : 'text-gray-400 hover:text-white'
            }`}
        >
          <Heart className="w-4 h-4" />
          Saved Recipes
          {activeTab === 'saved' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap ${activeTab === 'activity' ? 'text-amber-400' : 'text-gray-400 hover:text-white'
            }`}
        >
          <MessageCircle className="w-4 h-4" />
          My Activity
          {activeTab === 'activity' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'my_recipes' && (
          loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" /></div>
          ) : (
            <RecipesList recipes={myRecipes} />
          )
        )}

        {activeTab === 'saved' && (
          loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-amber-400" /></div>
          ) : (
            <>
              {savedRecipes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">You haven't saved any recipes yet.</div>
              ) : (
                <RecipesList recipes={savedRecipes} />
              )}
            </>
          )
        )}

        {activeTab === 'activity' && (
          <div className="max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Values & Discussions</h3>
            <ThreadList userId={user.id} />
          </div>
        )}
      </div>
    </div>
  )
}
