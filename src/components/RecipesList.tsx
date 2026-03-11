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
      {recipes && recipes.length === 0 && <li className='text-gray-500 font-(--font-bell)'>{d('noRecipesFound')}</li>}
      {recipes.map((recipe) => (
        <li
          key={recipe.id}
          className="group relative bg-white rounded-2xl p-5 border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-[#FF7D73]/30"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#FF7D73] to-[#FF7D73] flex items-center justify-center text-xs font-bold text-white shadow-md shadow-amber-900/20">
                  {recipe.firstName?.[0]}{recipe.lastName?.[0]}
                </div>
                <div className="font-[--font-imprint] text-xl truncate wrap-break-word overflow-wrap-anywhere text-gray-900 group-hover:text-[#FF7D73] transition-colors">
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
                className="px-8 py-4 rounded-lg bg-[#FFCCC81A] hover:bg-[#FFCCC8] border border-[#FFCCC8] text-[#FF7D73]! hover:text-[#FF7D73]! text-sm font-medium transition-all hover:scale-105 active:scale-95"
              >
                {b('viewDetails')}
              </Link>

              {togglePublished && (
                <button
                  className={`px-8 py-4 rounded-lg text-sm font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg border ${recipe.published
                    ? 'bg-[#FFCCC8] text-[#85312B] border-[#FFCCC8] hover:bg-[#FFCCC8]'
                    : 'bg-[#9BC9C3] text-[#26786E] border-[#9BC9C3] hover:bg-[#8AB8B1]'
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
