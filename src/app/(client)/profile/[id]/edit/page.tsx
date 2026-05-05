import { AddRecipe } from '@/components/AddRecipe'
import { Header } from '@/components/Header'
import { Recipe, recipes } from '@/db/schema'
import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchRecipe(id: string): Promise<Recipe | undefined> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }
  const db = drizzle(process.env.DATABASE_URL)
  const result = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, Number(id)))

  return result[0]
}

export default async function RecipePage({ params }: PageProps) {
  const routeParams = await params
  const user = await stackServerApp.getUser({ or: 'redirect' })
  const recipe = await fetchRecipe(routeParams.id)

  if (!recipe) notFound()

  const isAdmin = await checkAdminPermission(user)

  // Only the recipe owner or an admin may edit
  if (recipe.user_id !== user.id && !isAdmin) {
    redirect('/')
  }

  const hasAdminAccess = isAdmin

  return (
    <div className="min-h-svh flex flex-col">
      <Header hasAdminAccess={hasAdminAccess} />
      <main className="grow flex flex-col w-full object-top object-cover relative main-gradient min-h-svh">
        <Image
          src="/bg.webp"
          alt="Description"
          layout="fill"
          objectFit="cover"
          style={{ zIndex: -1 }}
        />
        <AddRecipe userId={user.id} recipe={recipe} />
      </main>
    </div>
  )
}
