'use client'

import { RecipesList } from '@/components/RecipesList'
import Button from '@/components/ui/Button'
import { Recipe } from '@/db/schema'
import { useUser } from '@stackframe/stack'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const fetchRecipes = async (userId: string) => {
  const res = await fetch(`/api/recipes?userId=${userId}`)
  const data = await res.json()
  return data.recipes
}

export default function Profile() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const l = useTranslations('labels')
  const b = useTranslations('buttons')
  const user = useUser()

  const loadRecipes = async (userId: string) => {
    setLoading(true)
    const data = await fetchRecipes(userId)
    setRecipes(data)
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      loadRecipes(user.id)
    }
  }, [user])

  // const togglePublished = async (id: number, published: boolean) => {
  //   await fetch('/api/recipes', {
  //     method: 'PATCH',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ id, published }),
  //   })
  //   if (user) {
  //     loadRecipes(user.id)
  //   }
  // }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold mb-4">{l('profile')}</h1>
        <Link href="/">
          <Button >{b('returnHome')}</Button>
        </Link>
        <Button onClick={() => user?.signOut()}>{b('logOut')}</Button>
      </div>
      {loading ? (
        <div>{b('loading')}</div>
      ) : (
        <RecipesList recipes={recipes} />
      )}
    </div>
  )
}
