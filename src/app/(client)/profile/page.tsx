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
import { Header } from '@/components/Header'
import Image from 'next/image'

// Add Activity type if needed, for now ThreadList handles fetching
export default function Profile() {
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'saved' | 'activity'>('my_recipes')
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  // const l = useTranslations('labels') // Unused currently?
  const b = useTranslations('buttons')
  const user = useUser()

  let hasPermissions = false
  if (user) {
    const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
    hasPermissions = team ? !!user.usePermission(team, 'team_member') : false
  }

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
    <div className="flex flex-col min-h-svh w-full relative">
     
      <div className="relative z-10 w-full bg-transparent">
        <Header
          hasAdminAccess={hasPermissions}
          user={user}
        />
      </div>

      <div className="flex-grow w-full max-w-5xl mx-auto p-4 md:p-8 pt-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 mt-4">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl border-primary-main text-primary-main font-[var(--font-bell)] mb-2">{user.displayName || 'Profile'}</h1>
            <p className="text-gray-500 font-light tracking-wide">Manage your recipes and activity</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => user?.signOut()}
              // variant="ghost"
              className="!bg-[#f98600] hover:opacity-80"
            >
              {b('logOut')}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-8 overflow-x-auto justify-center md:justify-start">
          <button
            onClick={() => setActiveTab('my_recipes')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap bg-transparent ${activeTab === 'my_recipes' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'
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
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap bg-transparent ${activeTab === 'saved' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'
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
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-all relative whitespace-nowrap bg-transparent ${activeTab === 'activity' ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400'
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
                  <div className="text-center py-12 text-gray-500 font-light">You haven't saved any recipes yet.</div>
                ) : (
                  <RecipesList recipes={savedRecipes} />
                )}
              </>
            )
          )}

          {activeTab === 'activity' && (
            <div className=" mx-auto md:mx-0">
              <h3 className="text-xl font-bold text-white mb-6 font-[var(--font-bell)]">Values & Discussions</h3>
              <ThreadList userId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
