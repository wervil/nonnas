'use client'
import { useEffect, useState } from 'react'
import { Recipe } from '@/db/schema'
import { useTranslations } from 'next-intl'
import { convertRecipesToHTML } from './convertRecipesToHTML'
import './styles.css'
import Button from '@/components/ui/Button'

const fetchRecipes = async () => {
  const res = await fetch(`/api/recipes?published=true`)
  const data = await res.json()
  return data.recipes
}
export default function PrintPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const l = useTranslations('labels')

  const loadRecipes = async () => {
    setLoading(true)
    const data = await fetchRecipes()
    setRecipes(data)
    setLoading(false)
  }

  useEffect(() => {
    loadRecipes()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full">
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxWidth: '200px',
        }}
      >
        <Button onClick={() => window.print()}>Browser Print</Button>
      </div>
      <div id="cookbook-content" className="w-fullpage">
        {convertRecipesToHTML(recipes, l)}
      </div>
    </div>
  )
}
