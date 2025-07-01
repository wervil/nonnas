import { DashboardRecipe } from '@/components/DashboardRecipe'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecipePage({ params }: PageProps) {
  const routeParams = await params

  return <DashboardRecipe id={routeParams.id} />
}
