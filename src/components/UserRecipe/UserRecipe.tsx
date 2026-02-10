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
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'

// Fetch recipe by ID
async function fetchRecipe(id: string) {
  const res = await fetch(`/api/recipes?id=${id}`)
  const data = await res.json()
  return data.recipes?.[0]
}

export const UserRecipe = ({
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

  if (loading) return <div className="p-4 flex flex-row gap-1 w-full h-[100vh] items-center justify-center"><LoaderCircle className='animate-spin' /> {b('loading')}</div>
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
      <div className="flex gap-4 p-4 action-buttons bg-white border-b border-gray-200 justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            onClick={goBack}
            className="flex items-center gap-2 !px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 border-none"
          >
            <ArrowLeft size={16} />
            <span className='hidden sm:block'>{b('goBack')}</span>
          </Button>
          <div className="flex items-center text-sm">
            <b className="text-gray-900 mr-2">{l('published')}:</b>{' '}
            <span className={sanitizedRecipe.published ? 'text-emerald-600 font-medium' : 'text-gray-500'}>
              {sanitizedRecipe.published ? d('yes') : d('no')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasAdminAccess ? (
            <>
              <button
                className={`px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${sanitizedRecipe.published
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                onClick={togglePublished}
              >
                {sanitizedRecipe.published ? b('unpublish') : b('publish')}
              </button>
              <Button onClick={() => window.print()} className="bg-gray-900 text-white hover:bg-gray-800">{b('browserPrint')}</Button>
            </>
          ) : (
            <Link href={`${id}/edit`}>
              <Button className="bg-gray-900 text-white hover:bg-gray-800">{b('edit')}</Button>
            </Link>
          )}
          <Button onClick={() => setShowDeleteDialog(true)} disabled={deleting} className='bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'>
            {deleting ? 'Deleting...' : b('delete')}
          </Button>
        </div>
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
              className="bg-gray-100 text-gray-900 hover:bg-gray-200"
            >
              Cancel
            </Button>

            <Button
              className='bg-red-600 text-white hover:bg-red-700'
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
