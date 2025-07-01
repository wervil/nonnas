import { LogOutButton } from '@/components/LogOutButton'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('homePage')
  const b = await getTranslations('buttons')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
      <p className="text-lg">{t('description')}</p>
      <Link
        href="/add-recipe"
        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {b('addNewRecipe')}
      </Link>
      <Link
        href="/recipes"
        className="mt-4 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        {b('viewRecipes')}
      </Link>
      <LogOutButton />
    </div>
  )
}
