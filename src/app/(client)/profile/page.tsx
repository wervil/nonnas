'use client'

import { Header } from '@/components/Header'
import { ProfileForm } from '@/components/ProfileForm'
import { ProfileTabSwitcher } from '@/components/ProfileTabSwitcher'
import { RecipesList } from '@/components/RecipesList'
import { SavedRecipesModal } from '@/components/SavedRecipesModal'
import ThreadList from '@/components/Threads/ThreadList'
import { Recipe } from '@/db/schema'
import { CurrentInternalUser, CurrentUser, useUser } from '@stackframe/stack'
import { Heart, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Profile() {
  const user = useUser()
  const router = useRouter()

  // Redirect when logged out (do it in an effect)
  useEffect(() => {
    if (!user) router.replace('/handler/sign-in')
  }, [user, router])

  if (!user) return null

  // Only render this when user exists
  return <ProfileAuthed user={user} />
}

function ProfileAuthed({ user }: { user: CurrentUser | CurrentInternalUser }) {
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [isSavedRecipesModalOpen, setIsSavedRecipesModalOpen] = useState(false)

  // SAFE: this component only mounts when user exists,
  // so these hooks are never "skipped"
  const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
  const hasPermissions = team ? !!user.usePermission(team, 'team_member') : false

  useEffect(() => {
    loadMyRecipes(user.id)
    loadSavedRecipes(user.id)
  }, [user.id])

  const loadMyRecipes = async (userId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recipes?userId=${userId}`)
      const data = await res.json()
      setMyRecipes(data.recipes || [])
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-svh w-full relative bg-white">

      <div className="relative z-10 w-full ">
        <Header
          hasAdminAccess={hasPermissions}
          user={user}
          className="bg-white/80 border-b border-gray-200 backdrop-blur-md"
        />
      </div>

      <div className="grow w-full max-w-5xl mx-auto p-4 md:p-8 pt-4 relative z-10">
        {/* Tab Switcher */}
        <ProfileTabSwitcher>
          {(activeTab) => {
            if (activeTab === 'profile') {
              return <ProfileForm user={user} />
            }

            if (activeTab === 'recipes') {
              return (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-(--font-bell) text-gray-900">My Recipes</h3>
                    <button
                      onClick={() => setIsSavedRecipesModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-[#F5F5F5]  text-sm font-medium transition-all hover:scale-105 active:scale-95"
                    >
                      <Heart className="w-4 h-4" />
                      Saved
                    </button>
                  </div>
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-(--color-yellow-light) w-8 h-8" />
                    </div>
                  ) : (
                    <RecipesList recipes={myRecipes} />
                  )}
                </>
              )
            }

            if (activeTab === 'activity') {
              return (
                <div className="mx-auto md:mx-0">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 font-[var(--font-bell)">Values & Discussions</h3>
                  <ThreadList userId={user.id} />
                </div>
              )
            }
          }}
        </ProfileTabSwitcher>
      </div>

      {/* Saved Recipes Modal */}
      <SavedRecipesModal
        isOpen={isSavedRecipesModalOpen}
        onClose={() => setIsSavedRecipesModalOpen(false)}
        savedRecipes={savedRecipes}
      />
    </div>
  )
}
