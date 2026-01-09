'use client'

import { useEffect, useState } from 'react'
import { Recipe } from '@/db/schema'
import { sanitizeHtml } from '@/utils/utils'
import Button from '@/components/ui/Button'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { convertRecipesToHTML } from '@/app/(admin)/print/convertRecipesToHTML'
import './styles.css'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

async function fetchRecipe(id: string) {
  const res = await fetch(`/api/recipes?id=${id}`)
  const data = await res.json()
  return data.recipes?.[0]
}

export const DashboardRecipe = ({
  id,
  hasAdminAccess,
}: {
  id: string
  hasAdminAccess: boolean
}) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const b = useTranslations('buttons')
  const d = useTranslations('descriptions')
  const l = useTranslations('labels')
  const router = useRouter()

  useEffect(() => {
    fetchRecipe(id).then((data) => {
      setRecipe(data)
      setLoading(false)
    })
  }, [id])

  const togglePublished = async () => {
    if (!recipe) {
      return
    }
    await fetch('/api/recipes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Number(id), published: !recipe.published }),
    })
    setRecipe({ ...recipe, published: !recipe.published })
  }

  const deleteRecipe = async () => {
    try {
      setDeleting(true)
      setShowDeleteDialog(false)
      
      const res = await fetch(`/api/recipes?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to delete recipe')
      }

      toast.success('Recipe deleted successfully')
      
      // Redirect back to dashboard after successful deletion
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete recipe')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="p-4">{b('loading')}</div>
  if (!recipe) return <div className="p-4">{d('noRecipesFound')}</div>

  const sanitizedRecipe = {
    ...recipe,
    history: sanitizeHtml(recipe.history || ''),
    geo_history: sanitizeHtml(recipe.geo_history || ''),
    recipe: sanitizeHtml(recipe.recipe || ''),
    directions: sanitizeHtml(recipe.directions || ''),
    influences: sanitizeHtml(recipe.influences || ''),
  }

  const goBack = () => {
    router.back()
  }

  return (
    <div className="w-full mx-auto">
      <div className="flex gap-4 p-4 action-buttons">
        <Button onClick={goBack}>{b('goBack')}</Button>
        <div className="mb-2">
          <b>{l('published')}:</b>{' '}
          {sanitizedRecipe.published ? d('yes') : d('no')}
        </div>
        {hasAdminAccess ? (
          <>
            <button
              className={`px-4 py-2 rounded cursor-pointer ${
                sanitizedRecipe.published
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 text-white'
              }`}
              onClick={togglePublished}
            >
              {sanitizedRecipe.published ? b('unpublish') : b('publish')}
            </button>
            <Button onClick={() => window.print()}>{b('browserPrint')}</Button>
          </>
        ) : (
          <Link href={`${id}/edit`}>
            <Button>{b('edit')}</Button>
          </Link>
        )}
        <Button onClick={() => setShowDeleteDialog(true)} disabled={deleting}>
          {deleting ? 'Deleting...' : b('delete')}
        </Button>
      </div>
      <div id="cookbook-content" className="w-fullpage">
        {convertRecipesToHTML([recipe], l)}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete recipe?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recipe? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => {
                setShowDeleteDialog(false)
              }}
            >
              Cancel
            </Button>

            <Button
              className='bg-red-800'
              onClick={deleteRecipe}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
