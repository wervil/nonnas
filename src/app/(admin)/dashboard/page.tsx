'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { RecipesList } from '@/components/RecipesList'
import { countriesData } from '@/utils/countries'
import { useRouter } from 'next/navigation'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useUser } from '@stackframe/stack'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

import { toast } from "sonner";

type StackUserRow = {
  id: string
  displayName: string | null
  primaryEmail: string | null
  signedUpAt?: string
  role: string // expected: "team_member" for admins; otherwise treat as client
}

const fetchStackUsers = async () => {
  const res = await fetch('/api/admin/users', { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.users as StackUserRow[]
}

const fetchRecipes = async (published: boolean, country: string) => {
  const res = await fetch(
    `/api/recipes?published=${published}${country ? `&country=${country}` : ''}`
  )
  const data = await res.json()
  return data.recipes ?? []
}

const countries = Object.keys(countriesData)

export default function Dashboard() {
  const user = useUser()
  const router = useRouter()

  // Optional: if dashboard should not render while logged out
  useEffect(() => {
    if (!user) router.replace('/handler/sign-in')
  }, [user, router])

  if (!user) return null

  // ✅ only mount the component that calls Stack hooks when user exists
  return <DashboardAuthed user={user} />
}

function DashboardAuthed({ user }: { user: any }) {
  /* ================= SUPER ADMIN ================= */
  const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() || ''
  const SUPER_ADMIN_SEC_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() || ''

  const currentEmail = user?.primaryEmail?.toLowerCase() || ''
  const isSuperAdmin =
    currentEmail && (currentEmail === SUPER_ADMIN_EMAIL || currentEmail === SUPER_ADMIN_SEC_EMAIL)

  /* ================= ADMIN PERMISSION ================= */
  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM || ''
  const team = user.useTeam(teamId) // ✅ always called (no conditional)
  const hasPermissions = !!(team && user.usePermission(team, 'team_member')) // ✅ always called

  return (
    <DashboardInner
      user={user}
      isSuperAdmin={isSuperAdmin}
      hasPermissions={hasPermissions}
      SUPER_ADMIN_EMAIL={SUPER_ADMIN_EMAIL}
      SUPER_ADMIN_SEC_EMAIL={SUPER_ADMIN_SEC_EMAIL}
    />
  )
}

function DashboardInner({
  user,
  isSuperAdmin,
  hasPermissions,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_SEC_EMAIL,
}: {
  user: any
  isSuperAdmin: any
  hasPermissions: boolean
  SUPER_ADMIN_EMAIL: string
  SUPER_ADMIN_SEC_EMAIL: string
}) {
  const [tab, setTab] = useState<'new' | 'published' | 'users'>('new')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [users, setUsers] = useState<StackUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [copied, setCopied] = useState(false)
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null)

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const l = useTranslations('labels')
  const d = useTranslations('descriptions')
  const b = useTranslations('buttons')

  const router = useRouter()

  /* ================= REDIRECT NON ADMINS ================= */
  useEffect(() => {
    if (user && !hasPermissions) {
      router.push('/')
    }
  }, [user, hasPermissions, router])

  /* ================= USERS TAB GUARD ================= */
  useEffect(() => {
    if (tab === 'users' && !isSuperAdmin) {
      setTab('new')
    }
  }, [tab, isSuperAdmin])

  /* ================= INVITE LINK ================= */
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/register?invite=${process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN}`

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy invite link', err)
    }
  }

  /* ================= ROLE UPDATE ================= */
  const updateUserRole = async (userId: string, role: 'team_member' | 'client') => {
    try {
      setRoleUpdatingId(userId)
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Failed to update role')
      }

      // Refresh list
      const u = await fetchStackUsers()
      setUsers(u)
    } catch (e) {
      console.error(e)
      alert('Failed to update role. Check console.')
    } finally {
      setRoleUpdatingId(null)
    }
  }

  /* ================= TOGGLE PUBLISHED ================= */
  const togglePublished = async (id: number, published: boolean) => {
    try {
      const res = await fetch('/api/recipes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, published }),
      })

      if (!res.ok) {
        throw new Error('Failed to update recipe')
      }

      // Update the local state
      setRecipes((prevRecipes) =>
        prevRecipes.map((recipe) =>
          recipe.id === id ? { ...recipe, published } : recipe
        )
      )

      toast.success(published ? 'Recipe published' : 'Recipe unpublished')
    } catch (error) {
      console.error('Error updating recipe:', error)
      toast.error('Failed to update recipe')
    }
  }

  /* ================= LOAD DATA ================= */
  const loadTabData = async () => {
    setLoading(true)
    try {
      if (tab === 'users') {
        // ✅ ALWAYS reset recipes (prevents undefined issues)
        setRecipes([])

        if (!isSuperAdmin) {
          setUsers([])
          return
        }

        const u = await fetchStackUsers()
        setUsers(u)
      } else {
        const data = await fetchRecipes(tab === 'published', selectedCountry)
        setRecipes(data)
        setUsers([])
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async () => {
    if (!deleteUserId) return

    try {
      setRoleUpdatingId(deleteUserId)

      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteUserId }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Failed to delete user')
      }

      toast.success('User deleted successfully')

      const u = await fetchStackUsers()
      setUsers(u)
    } catch (e) {
      console.error(e)
      toast.error('Something went wrong while deleting the user')
    } finally {
      setRoleUpdatingId(null)
      setDeleteUserId(null) // close dialog
    }
  }

  useEffect(() => {
    loadTabData()
    // eslint-disable-next-line
  }, [tab, selectedCountry, isSuperAdmin])

  /* ================= SUPER ADMIN FIRST ================= */
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aEmail = (a.primaryEmail || '').toLowerCase()
      const bEmail = (b.primaryEmail || '').toLowerCase()
      const aIsSuper = aEmail === SUPER_ADMIN_EMAIL || aEmail === SUPER_ADMIN_SEC_EMAIL
      const bIsSuper = bEmail === SUPER_ADMIN_EMAIL || bEmail === SUPER_ADMIN_SEC_EMAIL
      if (aIsSuper && !bIsSuper) return -1
      if (!aIsSuper && bIsSuper) return 1
      return 0
    })
  }, [users, SUPER_ADMIN_EMAIL, SUPER_ADMIN_SEC_EMAIL])

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            {l('dashboard')}

          </h1>

          <div className="flex flex-wrap gap-3">
            {hasPermissions && (
              <Button
                onClick={copyInviteLink}
                className="bg-gray-100 hover:bg-gray-200 hover:opacity-100 text-gray-900 transition-colors"
                variant="empty" // overriding styles manually
              >
                {copied ? 'Copied ✓' : 'Copy Invite Link'}
              </Button>
            )}

            <Link href="/">
              <Button className="bg-gray-100 hover:bg-gray-200 hover:opacity-100 text-gray-900 transition-colors" variant="empty">
                {b('returnHome')}
              </Button>
            </Link>

            <Button
              onClick={async () => {
                await user.signOut()
                window.location.href = '/'
              }}
              className="bg-gray-100 hover:bg-gray-200 hover:opacity-100 text-gray-900 transition-colors"
              variant="empty"
            >
              {b('logOut')}
            </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            className={`px-6 py-3 rounded-lg font-[var(--font-bell)] text-lg transition-all duration-200 ${tab === 'new'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            onClick={() => setTab('new')}
          >
            {d('newRecipes')}
          </button>

          <button
            className={`px-6 py-3 rounded-lg font-[var(--font-bell)] text-lg transition-all duration-200 ${tab === 'published'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            onClick={() => setTab('published')}
          >
            {d('publishedRecipes')}
          </button>

          {isSuperAdmin && (
            <button
              className={`px-6 py-3 rounded-lg font-[var(--font-bell)] text-lg transition-all duration-200 ${tab === 'users'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              onClick={() => setTab('users')}
            >
              {d('users')}
            </button>
          )}

          {tab !== 'users' && (
            <div className="min-w-[200px]">
              <SearchableSelect
                options={countries.map((c) => ({
                  value: countriesData[c as keyof typeof countriesData].name,
                  label: countriesData[c as keyof typeof countriesData].name,
                  flag: countriesData[c as keyof typeof countriesData].flag,
                }))}
                value={selectedCountry}
                onChange={setSelectedCountry}
                placeholder={l('all')}
                variant="light"
              />
            </div>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-xl font-[var(--font-bell)]">
              {b('loading')}
            </div>
          </div>
        ) : tab === 'users' ? (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="grid grid-cols-6 gap-4 p-4 font-[var(--font-bell)] bg-gray-50 text-gray-700 font-medium min-w-0 border-b border-gray-200">
              <div className="min-w-0">Name</div>
              <div className="min-w-0">Email</div>
              <div>Role</div>
              <div>Signed up</div>
              <div className="text-right">Action</div>
              <div className="text-right">Delete</div>
            </div>

            {sortedUsers.map((u) => {
              const userEmail = (u.primaryEmail || '').toLowerCase()
              const isSuper = userEmail === SUPER_ADMIN_EMAIL || userEmail === SUPER_ADMIN_SEC_EMAIL

              const isAdmin = u.role === 'team_member'
              const badge = isSuper ? 'Super Admin' : isAdmin ? 'Admin' : 'Client'

              return (
                <div
                  key={u.id}
                  className={`grid grid-cols-6 gap-4 p-4 border-t border-gray-100 items-center transition-colors hover:bg-gray-50 min-w-0 ${isSuper ? 'bg-amber-50/50' : ''
                    }`}
                >
                  <div className="min-w-0 truncate text-gray-900 font-[var(--font-bell)]" title={u.displayName || undefined}>
                    {u.displayName || '—'}
                  </div>
                  <div className="min-w-0 truncate text-gray-600 font-[var(--font-bell)]" title={u.primaryEmail || undefined}>
                    {u.primaryEmail || '—'}
                  </div>

                  <div>
                    {isSuper ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                        {badge}
                      </span>
                    ) : isAdmin ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                        {badge}
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="text-gray-500 font-[var(--font-bell)] text-sm">
                    {u.signedUpAt ? new Date(u.signedUpAt).toLocaleString() : '—'}
                  </div>

                  {/* Role toggle */}
                  <div className="flex justify-end">
                    {isSuper ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <Button
                        onClick={() =>
                          updateUserRole(u.id, isAdmin ? 'client' : 'team_member')
                        }
                        disabled={roleUpdatingId === u.id}
                        className="bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 text-sm px-4 py-2"
                        variant="empty"
                      >
                        {roleUpdatingId === u.id
                          ? 'Updating...'
                          : isAdmin
                            ? 'Make Client'
                            : 'Make Admin'}
                      </Button>
                    )}
                  </div>

                  {/* Delete (super admin only) */}
                  <div className="flex justify-end">
                    {!isSuperAdmin || isSuper ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <Button
                        className='bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-sm px-4 py-2'
                        onClick={() => setDeleteUserId(u.id)}
                        disabled={roleUpdatingId === u.id}
                        variant="empty"
                      >
                        Delete
                      </Button>

                    )}
                  </div>
                </div>
              )
            })}

          </div>
        ) : (
          <RecipesList recipes={recipes} togglePublished={togglePublished} />
        )}

        <Dialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
          <DialogContent className="bg-white border-gray-200 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-gray-900 font-[var(--font-bell)] text-2xl">
                Delete user?
              </DialogTitle>
              <DialogDescription className="text-gray-500 font-[var(--font-bell)]">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button
                className="bg-gray-100 hover:bg-gray-200 text-gray-900"
                onClick={() => {
                  setDeleteUserId(null)
                  toast('Deletion cancelled')
                }}
                variant="empty"
              >
                Cancel
              </Button>

              <Button
                className='bg-red-600 hover:bg-red-700 text-white shadow-sm'
                onClick={deleteUser}
                disabled={!!roleUpdatingId}
                variant="empty"
              >
                {roleUpdatingId ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
