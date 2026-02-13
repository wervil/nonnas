'use client'
import { Recipe } from '@/db/schema'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  recipes: Recipe[]
  togglePublished?: (id: number, published: boolean) => void
}

export const RecipesList = ({ recipes, togglePublished }: Props) => {
  const b = useTranslations('buttons')
  const d = useTranslations('descriptions')
  const pathname = usePathname()

  return (
    <ul className="space-y-4">
      {recipes && recipes.length === 0 && <li className='text-gray-500 font-light font-[var(--font-bell)]'>{d('noRecipesFound')}</li>}
      {recipes.map((recipe) => (
        <li
          key={recipe.id}
          className="group relative bg-white rounded-2xl p-5 border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-amber-500/30"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-amber-900/20">
                  {recipe.firstName?.[0]}{recipe.lastName?.[0]}
                </div>
                <div className="font-[var(--font-imprint)] text-xl truncate break-words overflow-wrap-anywhere text-gray-900 group-hover:text-amber-600 transition-colors">
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
                className="px-4 py-2 rounded-xl bg-gray-50 hover:bg-amber-50 border whitespace-nowrap border-gray-200 hover:border-amber-200 !text-gray-700 hover:text-amber-700 text-sm font-medium transition-all hover:scale-105 active:scale-95"
              >
                {b('viewDetails')}
              </Link>

              {togglePublished && (
                <button
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg ${recipe.published
                    ? 'bg-blue-300 !text-white'
                    : 'bg-green-300 !text-white'
                    }`}
                  onClick={() => togglePublished(recipe.id, !recipe.published)}
                >
                  {recipe.published ? b('unpublish') : b('publish')}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
