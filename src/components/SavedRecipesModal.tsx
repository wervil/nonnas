'use client'

import { Recipe } from '@/db/schema'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SavedRecipesModalProps {
  isOpen: boolean
  onClose: () => void
  savedRecipes: Recipe[]
}

export function SavedRecipesModal({ isOpen, onClose, savedRecipes }: SavedRecipesModalProps) {
  const b = useTranslations('buttons')
  const pathname = usePathname()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-(--font-bell) text-gray-900">
            Saved Recipes
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {savedRecipes.length === 0 ? (
            <div className="text-center py-12 text-gray-500 font-(--font-bell)">
              You haven&apos;t saved any recipes yet.
            </div>
          ) : (
            <ul className="space-y-4">
              {savedRecipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className="group relative bg-white rounded-2xl p-5 border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-amber-500/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-(--font-bell) text-white shadow-md shadow-amber-900/20">
                          {recipe.firstName?.[0]}{recipe.lastName?.[0]}
                        </div>
                        <div className="font-(--font-imprint) text-xl truncate wrap-break-word overflow-wrap-anywhere text-gray-900 group-hover:text-amber-600 transition-colors">
                          {recipe.firstName} {recipe.lastName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-400 ml-11">
                        <span>{recipe.country}</span>
                        {recipe.region && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{recipe.region}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-11 sm:ml-0">
                      <Link
                        href={`${pathname}/${recipe.id}`}
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-[#FFCCC81A] hover:bg-[#FFCCC8] border border-[#FFCCC8] text-[#FF7D73] hover:text-[#FF7D73] text-sm font-medium transition-all hover:scale-105 active:scale-95"
                      >
                        {b('viewDetails')}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
