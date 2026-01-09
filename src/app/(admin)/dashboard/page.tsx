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
  const SUPER_ADMIN_EMAIL =
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() || ''
  const currentEmail = user?.primaryEmail?.toLowerCase() || ''
  const isSuperAdmin = !!SUPER_ADMIN_EMAIL && currentEmail === SUPER_ADMIN_EMAIL

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
      const aIsSuper =
        (a.primaryEmail || '').toLowerCase() === SUPER_ADMIN_EMAIL
      const bIsSuper =
        (b.primaryEmail || '').toLowerCase() === SUPER_ADMIN_EMAIL
      if (aIsSuper && !bIsSuper) return -1
      if (!aIsSuper && bIsSuper) return 1
      return 0
    })
  }, [users, SUPER_ADMIN_EMAIL])

  /* ================= RENDER ================= */
  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{l('dashboard')}</h1>

        <div className="flex gap-2">
          {hasPermissions && (
            <Button onClick={copyInviteLink}>
              {copied ? 'Copied ✓' : 'Copy Invite Link'}
            </Button>
          )}

          <Link href="/">
            <Button>{b('returnHome')}</Button>
          </Link>

          <Button onClick={() => user?.signOut()}>{b('logOut')}</Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            tab === 'new' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setTab('new')}
        >
          {d('newRecipes')}
        </button>

        <button
          className={`px-4 py-2 rounded ${
            tab === 'published' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setTab('published')}
        >
          {d('publishedRecipes')}
        </button>

        {isSuperAdmin && (
          <button
            className={`px-4 py-2 rounded ${
              tab === 'users' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setTab('users')}
          >
            {d('users')}
          </button>
        )}

        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full p-3 border rounded-lg"
        >
          <option value="">{l('all')}</option>
          {countries.map((c) => (
            <option
              key={c}
              value={countriesData[c as keyof typeof countriesData].name}
            >
              {countriesData[c as keyof typeof countriesData].flag}{' '}
              {countriesData[c as keyof typeof countriesData].name}
            </option>
          ))}
        </select>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div>{b('loading')}</div>
      ) : tab === 'users' ? (
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-6 gap-2 p-3 font-semibold bg-gray-50">
            <div>Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Signed up</div>
            <div className="text-right">Action</div>
            <div className="text-right">Delete</div>
          </div>

          {sortedUsers.map((u) => {
  const isSuper =
    (u.primaryEmail || '').toLowerCase() === SUPER_ADMIN_EMAIL

  const isAdmin = u.role === 'team_member'
  const badge = isSuper ? 'Super Admin' : isAdmin ? 'Admin' : 'Client'

  return (
    <div
      key={u.id}
      className={`grid grid-cols-6 gap-2 p-3 border-t items-center ${
        isSuper ? 'bg-yellow-50' : ''
      }`}
    >
      <div>{u.displayName || '—'}</div>
      <div className="truncate">{u.primaryEmail || '—'}</div>

      <div>
        {isSuper ? (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-400 text-black font-semibold">
            {badge}
          </span>
        ) : isAdmin ? (
          <span className="text-xs px-2 py-0.5 rounded bg-green-400 text-black font-semibold">
            {badge}
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-black font-semibold">
            {badge}
          </span>
        )}
      </div>

      <div>
        {u.signedUpAt ? new Date(u.signedUpAt).toLocaleString() : '—'}
      </div>

      {/* Role toggle */}
      <div className="flex justify-end">
        {isSuper ? (
          <span className="text-xs text-gray-500">—</span>
        ) : (
          <Button
            onClick={() =>
              updateUserRole(u.id, isAdmin ? 'client' : 'team_member')
            }
            disabled={roleUpdatingId === u.id}
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
          <span className="text-xs text-gray-500">—</span>
        ) : (
          <Button
              className='bg-red-800'
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
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete user?</DialogTitle>
      <DialogDescription>
        This action is permanent and cannot be undone.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter className="gap-2">
      <Button
        
        onClick={() => {
          setDeleteUserId(null)
          toast('Deletion cancelled')
        }}
      >
        Cancel
      </Button>

      <Button
        className='bg-red-800'
        onClick={deleteUser}
        disabled={!!roleUpdatingId}
      >
        {roleUpdatingId ? 'Deleting...' : 'Delete'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </div>
  )
}
