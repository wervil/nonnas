import { AddRecipe } from '@/components/AddRecipe'
import { Header } from '@/components/Header'
import { Recipe } from '@/db/schema'
import { stackServerApp } from '@/stack'
import Image from 'next/image'

interface PageProps {
  params: Promise<{ id: string }>
}

async function fetchRecipe(id: string): Promise<Recipe> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recipes?id=${id}`
  )
  const data = await res.json()
  return data.recipes?.[0]
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
