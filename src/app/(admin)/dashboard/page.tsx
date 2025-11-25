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
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const l = useTranslations('labels')
  const d = useTranslations('descriptions')
  const b = useTranslations('buttons')
  const user = useUser()
  let hasPermissions = true
  if (user) {
    const team = user.useTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
    hasPermissions = team ? !!user.usePermission(team, 'admin:access') : false
  }
  const router = useRouter()
  if (!hasPermissions) {
    router.push('/')
  }

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

  const togglePublished = async (id: number, published: boolean) => {
    await fetch('/api/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, published }),
    })
    loadRecipes()
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-4">{l('dashboard')}</h1>
        <Link href="/">
          <Button>{b('returnHome')}</Button>
        </Link>
        <Button onClick={() => user?.signOut()}>{b('logOut')}</Button>
      </div>
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

        <select
          value={selectedCountry}
          onChange={(e) => {
            console.log(e.target.value)
            setSelectedCountry(e.target.value)
          }}
          className={`w-full shrink p-3 border rounded-lg focus:outline-none text-base text-text-pale font-[var(--font-merriweather)]`}
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
      {loading ? (
        <div>{b('loading')}</div>
      ) : (
        <RecipesList recipes={recipes} togglePublished={togglePublished} />
      )}
    </div>
  )
}
