'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { RecipesList } from '@/components/RecipesList'
import { countriesData } from '@/utils/countries'
import { useRouter } from 'next/navigation'
import { useUser } from '@stackframe/stack'

const fetchRecipes = async (published: boolean, country: string) => {
  const res = await fetch(
    `/api/recipes?published=${published}${country ? `&country=${country}` : ''}`
  )
  const data = await res.json()
  return data.recipes
}

const countries = Object.keys(countriesData)

export default function Dashboard() {
  const [tab, setTab] = useState<'new' | 'published'>('new')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [copied, setCopied] = useState(false)

  const l = useTranslations('labels')
  const d = useTranslations('descriptions')
  const b = useTranslations('buttons')

  const user = useUser()
  const router = useRouter()

  /**
   * ADMIN CHECK (team_member)
   */
  let hasPermissions = false
  if (user) {
    const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
    hasPermissions = team ? !!user.usePermission(team, 'team_member') : false
  }

  /**
   * Redirect non-admins away
   */
  useEffect(() => {
    if (user && !hasPermissions) {
      router.push('/')
    }
  }, [user, hasPermissions, router])

  /**
   * ADMIN INVITE LINK
   */
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

  /**
   * Load recipes
   */
  const loadRecipes = async () => {
    setLoading(true)
    const data = await fetchRecipes(tab === 'published', selectedCountry)
    setRecipes(data)
    setLoading(false)
  }

  useEffect(() => {
    loadRecipes()
    // eslint-disable-next-line
  }, [tab, selectedCountry])

  /**
   * Publish toggle
   */
  const togglePublished = async (id: number, published: boolean) => {
    await fetch('/api/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, published }),
    })
    loadRecipes()
  }

  /**
   * RENDER
   */
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

          <Button onClick={() => user?.signOut()}>
            {b('logOut')}
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            tab === 'new'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          }`}
          onClick={() => setTab('new')}
        >
          {d('newRecipes')}
        </button>

        <button
          className={`px-4 py-2 rounded ${
            tab === 'published'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200'
          }`}
          onClick={() => setTab('published')}
        >
          {d('publishedRecipes')}
        </button>

        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full shrink p-3 border rounded-lg focus:outline-none text-base"
        >
          <option value="">{l('all')}</option>
          {countries.map((country) => (
            <option
              key={country}
              value={countriesData[country as keyof typeof countriesData].name}
            >
              {countriesData[country as keyof typeof countriesData].flag}{' '}
              {countriesData[country as keyof typeof countriesData].name}
            </option>
          ))}
        </select>
      </div>

      {/* LIST */}
      {loading ? (
        <div>{b('loading')}</div>
      ) : (
        <RecipesList
          recipes={recipes}
          togglePublished={togglePublished}
        />
      )}
    </div>
  )
}
