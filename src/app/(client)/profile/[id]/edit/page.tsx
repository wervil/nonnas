import { AddRecipe } from '@/components/AddRecipe'
import { Header } from '@/components/Header'
import { Recipe, recipes } from '@/db/schema'
import { stackServerApp } from '@/stack'
import Image from 'next/image'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { eq } from 'drizzle-orm'

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
  const recipe = await fetchRecipe(routeParams.id)
  const user = await stackServerApp.getUser()

  return (
    <div className="min-h-svh flex flex-col">
      <Header hasAdminAccess={false} />
      <main className="grow flex flex-col w-full object-top object-cover relative main-gradient min-h-svh">
        <Image
          src="/bg.webp"
          alt="Description"
          layout="fill"
          objectFit="cover"
          style={{ zIndex: -1 }}
        />
        <AddRecipe userId={user?.id} recipe={recipe} />
      </main>
    </div>
  )
}
