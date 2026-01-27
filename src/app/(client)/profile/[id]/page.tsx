import { UserRecipe } from '@/components/UserRecipe/UserRecipe'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecipePage({ params }: PageProps) {
  const routeParams = await params

  return <UserRecipe id={routeParams.id} hasAdminAccess={false} />
}
