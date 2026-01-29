'use client'

import { RecipesList } from '@/components/RecipesList'
import ThreadList from '@/components/Threads/ThreadList'
import Button from '@/components/ui/Button'
import { Recipe } from '@/db/schema'
import { useUser } from '@stackframe/stack'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Loader2, BookOpen, Heart, MessageCircle, Pencil } from 'lucide-react'
import { Header } from '@/components/Header'
import { EditProfileModal } from '@/components/EditProfileModal'
import { useRouter } from 'next/navigation'

export default function Profile() {
  const user = useUser()
  const router = useRouter()

  // ✅ Redirect when logged out (do it in an effect)
  useEffect(() => {
    if (!user) router.replace('/handler/sign-in')
  }, [user, router])

  if (!user) return null

  // ✅ Only render this when user exists
  return <ProfileAuthed user={user} />
}

function ProfileAuthed({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'my_recipes' | 'saved' | 'activity'>('my_recipes')
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([])
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const hasInitializedTab = useRef(false)

  const b = useTranslations('buttons')

  // ✅ SAFE: this component only mounts when user exists,
  // so these hooks are never “skipped”
  const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
  const hasPermissions = team ? !!user.usePermission(team, 'team_member') : false

  useEffect(() => {
    if (hasPermissions && !hasInitializedTab.current) {
      setActiveTab('saved')
      hasInitializedTab.current = true
    }
  }, [hasPermissions])

  useEffect(() => {
    if (activeTab === 'my_recipes') loadMyRecipes(user.id)
    else if (activeTab === 'saved') loadSavedRecipes(user.id)
  }, [activeTab, user.id])

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
    <div className="flex flex-col min-h-svh w-full relative bg-[var(--color-brown-dark)]">

      <div className="relative z-10 w-full ">
        <Header
          hasAdminAccess={hasPermissions}
          user={user}
          className="!bg-[var(--color-brown-dark)]/80  border-b border-[var(--color-primary-border)]/20"
        />
      </div>

      <div className="flex-grow w-full max-w-5xl mx-auto p-4 md:p-8 pt-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 mt-4">
          <div className="text-center md:text-left min-w-0 max-w-full">
            <h1 className="text-4xl md:text-5xl font-bold !text-[var(--color-yellow-light)] font-[var(--font-bell)] mb-2 break-words overflow-hidden line-clamp-3 max-w-[600px] mx-auto md:mx-0" title={user.displayName || undefined}>
              {user.displayName || 'Profile'}
            </h1>
            <p className="text-[var(--color-text-pale)] font-light tracking-wide font-[var(--font-bell)]">Manage your recipes and activity</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button
              onClick={() => setEditProfileOpen(true)}
              variant="outline"
              className="border-[var(--color-primary-border)]/40 text-[var(--color-yellow-light)] hover:bg-[var(--color-brown-dark)]/50"
            >
              <Pencil className="w-4 h-4 mr-2" />
              {b('edit')}
            </Button>
            <Button
              onClick={() => user?.signOut()}
              className="bg-[var(--color-brown-light)] hover:opacity-90 text-[var(--color-yellow-light)]"
            >
              {b('logOut')}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-primary-border)]/20 mb-8 overflow-x-auto justify-center md:justify-start">
          {!hasPermissions && (
            <button
              onClick={() => setActiveTab('my_recipes')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-[var(--font-bell)] transition-all duration-200 relative whitespace-nowrap ${activeTab === 'my_recipes'
                ? 'text-[var(--color-yellow-light)] bg-gradient-to-b from-[var(--color-green-dark)]/20 to-transparent'
                : 'text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] bg-transparent'
                }`}
            >
              <BookOpen className="w-4 h-4" />
              My Recipes
              {activeTab === 'my_recipes' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--color-green-dark)] via-[var(--color-success-main)] to-[var(--color-green-dark)]" />
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-[var(--font-bell)] transition-all duration-200 relative whitespace-nowrap ${activeTab === 'saved'
              ? 'text-[var(--color-yellow-light)] bg-gradient-to-b from-[var(--color-green-dark)]/20 to-transparent'
              : 'text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] bg-transparent'
              }`}
          >
            <Heart className="w-4 h-4" />
            Saved Recipes
            {activeTab === 'saved' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--color-green-dark)] via-[var(--color-success-main)] to-[var(--color-green-dark)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-[var(--font-bell)] transition-all duration-200 relative whitespace-nowrap ${activeTab === 'activity'
              ? 'text-[var(--color-yellow-light)] bg-gradient-to-b from-[var(--color-green-dark)]/20 to-transparent'
              : 'text-[var(--color-text-pale)] hover:text-[var(--color-yellow-light)] bg-transparent'
              }`}
          >
            <MessageCircle className="w-4 h-4" />
            My Activity
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--color-green-dark)] via-[var(--color-success-main)] to-[var(--color-green-dark)]" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {!hasPermissions && activeTab === 'my_recipes' && (
            loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[var(--color-yellow-light)] w-8 h-8" />
              </div>
            ) : (
              <RecipesList recipes={myRecipes} />
            )
          )}


          {activeTab === 'saved' && (
            loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[var(--color-yellow-light)] w-8 h-8" />
              </div>
            ) : (
              <>
                {savedRecipes.length === 0 ? (
                  <div className="text-center py-12 text-[var(--color-text-pale)] font-light font-[var(--font-bell)]">
                    You haven&apos;t saved any recipes yet.
                  </div>
                ) : (
                  <RecipesList recipes={savedRecipes} />
                )}
              </>
            )
          )}

          {activeTab === 'activity' && (
            <div className="mx-auto md:mx-0">
              <h3 className="text-xl font-bold text-[var(--color-yellow-light)] mb-6 font-[var(--font-bell)]">Values & Discussions</h3>
              <ThreadList userId={user.id} />
            </div>
          )}
        </div>
      </div>

      <EditProfileModal
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        user={user}
      />
    </div>
  )
}
