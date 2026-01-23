'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { RecipesList } from '@/components/RecipesList'
import { countriesData } from '@/utils/countries'
import { useRouter } from 'next/navigation'
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

  const user = useUser()
  const router = useRouter()

  /* ================= SUPER ADMIN ================= */
  const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() || ''
  const SUPER_ADMIN_SEC_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() || ''

  const currentEmail = user?.primaryEmail?.toLowerCase() || ''
  const isSuperAdmin = currentEmail && (currentEmail === SUPER_ADMIN_EMAIL || currentEmail === SUPER_ADMIN_SEC_EMAIL)

  /* ================= ADMIN PERMISSION ================= */
  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM || ''
  const team = user ? user.useTeam(teamId) : null
  const hasPermissions = !!(team && user?.usePermission(team, 'team_member'))

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
    <div className="min-h-screen bg-[var(--color-brown-dark)]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold !text-white/80">
            {l('dashboard')}

          </h1>

          <div className="flex flex-wrap gap-3">
            {hasPermissions && (
              <Button
                onClick={copyInviteLink}
                className="bg-[var(--color-green-dark)] hover:opacity-90 text-[var(--color-yellow-light)]"
              >
                {copied ? 'Copied ✓' : 'Copy Invite Link'}
              </Button>
            )}

            <Link href="/">
              <Button className="bg-[var(--color-brown-light)] hover:opacity-90 text-[var(--color-yellow-light)]">
                {b('returnHome')}
              </Button>
            </Link>

            <Button
              onClick={() => user?.signOut()}
              className="bg-[var(--color-brown-light)] hover:opacity-90 text-[var(--color-yellow-light)]"
            >
              {b('logOut')}
            </Button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            className={`px-6 py-3 rounded-lg font-[var(--font-bell)] text-lg transition-all duration-200 ${tab === 'new'
              ? 'bg-[var(--color-green-dark)] text-[var(--color-yellow-light)] shadow-lg shadow-[var(--color-green-dark)]/30'
              : 'bg-[var(--color-brown-pale)] text-[var(--color-text-pale)] hover:bg-[var(--color-brown-light)] border border-[var(--color-primary-border)]/20'
              }`}
            onClick={() => setTab('new')}
          >
            {d('newRecipes')}
          </button>

          <button
            className={`px-6 py-3 rounded-lg font-[var(--font-bell)] text-lg transition-all duration-200 ${tab === 'published'
              ? 'bg-[var(--color-green-dark)] text-[var(--color-yellow-light)] shadow-lg shadow-[var(--color-green-dark)]/30'
              : 'bg-[var(--color-brown-pale)] text-[var(--color-text-pale)] hover:bg-[var(--color-brown-light)] border border-[var(--color-primary-border)]/20'
              }`}
            onClick={() => setTab('published')}
          >
            {d('publishedRecipes')}
          </button>

          {isSuperAdmin && (
            <button
              className={`px-6 py-3 rounded-lg font-[var(--font-bell)] text-lg transition-all duration-200 ${tab === 'users'
                ? 'bg-[var(--color-green-dark)] text-[var(--color-yellow-light)] shadow-lg shadow-[var(--color-green-dark)]/30'
                : 'bg-[var(--color-brown-pale)] text-[var(--color-text-pale)] hover:bg-[var(--color-brown-light)] border border-[var(--color-primary-border)]/20'
                }`}
              onClick={() => setTab('users')}
            >
              {d('users')}
            </button>
          )}

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            aria-label="Filter by country"
            title="Filter by country"
            className="px-4 py-3 rounded-lg bg-[var(--color-brown-pale)] text-[var(--color-text-pale)] border border-[var(--color-primary-border)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-dark)]/50 font-[var(--font-bell)] min-w-[200px]"
          >
            <option value="" className="bg-[var(--color-brown-pale)]">{l('all')}</option>
            {countries.map((c) => (
              <option
                key={c}
                value={countriesData[c as keyof typeof countriesData].name}
                className="bg-[var(--color-brown-pale)]"
              >
                {countriesData[c as keyof typeof countriesData].flag}{' '}
                {countriesData[c as keyof typeof countriesData].name}
              </option>
            ))}
          </select>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-[var(--color-text-pale)] text-xl font-[var(--font-bell)]">
              {b('loading')}
            </div>
          </div>
        ) : tab === 'users' ? (
          <div className="rounded-xl border border-[var(--color-primary-border)]/20 overflow-hidden bg-[var(--color-brown-pale)] shadow-lg">
            <div className="grid grid-cols-6 gap-4 p-4 font-[var(--font-bell)] bg-[var(--color-brown-light)] text-[var(--color-yellow-light)]">
              <div>Name</div>
              <div>Email</div>
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
                  className={`grid grid-cols-6 gap-4 p-4 border-t border-[var(--color-primary-border)]/10 items-center transition-colors hover:bg-[var(--color-brown-light)]/50 ${isSuper ? 'bg-[var(--color-warning-main)]/10' : ''
                    }`}
                >
                  <div className="text-[var(--color-text-pale)] font-[var(--font-bell)]">{u.displayName || '—'}</div>
                  <div className="truncate text-[var(--color-text-pale)] font-[var(--font-bell)]">{u.primaryEmail || '—'}</div>

                  <div>
                    {isSuper ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-warning-main)]/30 text-[var(--color-warning-main)] font-semibold border border-[var(--color-warning-main)]/50">
                        {badge}
                      </span>
                    ) : isAdmin ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-success-main)]/30 text-[var(--color-success-main)] font-semibold border border-[var(--color-success-main)]/50">
                        {badge}
                      </span>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-primary-border)]/30 text-[var(--color-primary-border)] font-semibold border border-[var(--color-primary-border)]/50">
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="text-[var(--color-text-pale)] font-[var(--font-bell)] text-sm">
                    {u.signedUpAt ? new Date(u.signedUpAt).toLocaleString() : '—'}
                  </div>

                  {/* Role toggle */}
                  <div className="flex justify-end">
                    {isSuper ? (
                      <span className="text-xs text-[var(--color-text-pale)]/50">—</span>
                    ) : (
                      <Button
                        onClick={() =>
                          updateUserRole(u.id, isAdmin ? 'client' : 'team_member')
                        }
                        disabled={roleUpdatingId === u.id}
                        className="bg-[var(--color-green-dark)] hover:opacity-90 text-[var(--color-yellow-light)] text-sm px-4 py-2"
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
                      <span className="text-xs text-[var(--color-text-pale)]/50">—</span>
                    ) : (
                      <Button
                        className='bg-[var(--color-danger-main)] hover:opacity-90 text-white text-sm px-4 py-2'
                        onClick={() => setDeleteUserId(u.id)}
                        disabled={roleUpdatingId === u.id}
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
          <DialogContent className="bg-[var(--color-brown-pale)] border-[var(--color-primary-border)]/20">
            <DialogHeader>
              <DialogTitle className="text-[var(--color-yellow-light)] font-[var(--font-bell)] text-2xl">
                Delete user?
              </DialogTitle>
              <DialogDescription className="text-[var(--color-text-pale)] font-[var(--font-bell)]">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button
                className="bg-[var(--color-brown-light)] hover:opacity-90 text-[var(--color-yellow-light)]"
                onClick={() => {
                  setDeleteUserId(null)
                  toast('Deletion cancelled')
                }}
              >
                Cancel
              </Button>

              <Button
                className='bg-[var(--color-danger-main)] hover:opacity-90 text-white'
                onClick={deleteUser}
                disabled={!!roleUpdatingId}
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
