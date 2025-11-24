import { DashboardRecipe } from '@/components/DashboardRecipe/DashboardRecipe'
import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RecipePage({ params }: PageProps) {
  const routeParams = await params
  // const user = await stackServerApp.getUser({ or: 'redirect' })
  // const hasAdminAccess = user ? await checkAdminPermission(user) : false
  // if (!hasAdminAccess) {
  //   return null
  // }

  return <DashboardRecipe id={routeParams.id} hasAdminAccess={true} />
}
