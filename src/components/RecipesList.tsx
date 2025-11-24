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
      {recipes.length === 0 && <li>{d('noRecipesFound')}</li>}
      {recipes.map((recipe) => (
        <li
          key={recipe.id}
          className="border p-4 rounded flex justify-between items-center"
        >
          <div>
            <div className="font-semibold">{`${recipe.firstName} ${recipe.lastName}`}</div>
            <div className="text-sm text-gray-500">
              {recipe.country}
              {recipe.region ? `, ${recipe.region}` : ''}
            </div>
            <Link
              href={`${pathname}/${recipe.id}`}
              className="text-blue-600 underline text-sm cursor-pointer"
            >
              {b('viewDetails')}
            </Link>
          </div>
          {togglePublished ? (
            <button
              className={`px-3 py-1 rounded cursor-pointer ${
                recipe.published
                  ? 'bg-yellow-500 text-white'
                  : 'bg-green-500 text-white'
              }`}
              onClick={() => togglePublished(recipe.id, !recipe.published)}
            >
              {recipe.published ? b('unpublish') : b('publish')}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
