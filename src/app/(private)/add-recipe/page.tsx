import { AddRecipe } from '@/components/AddRecipe'
import { stackServerApp } from '@/stack'
import { CurrentServerUser } from '@stackframe/stack'

import { DashboardLink } from '@/components/DashboardLink'

const checkAdminPermission = async (user: CurrentServerUser) => {
  const team = await user.getTeam('ceb8fee5-afef-4134-a4c1-32312c8fd69c')
  if (team) {
    const permission = await user.getPermission(team, 'admin:access')
    if (permission?.id === 'admin:access') {
      return true
    }
    return false
  }
  return false
}

const AddRecipePage = async () => {
  const user = await stackServerApp.getUser({ or: 'redirect' })
  const hasAdminAccess = await checkAdminPermission(user)

  return (
    <>
      {hasAdminAccess ? <DashboardLink /> : null}
      <AddRecipe userId={user.id} />
    </>
  )
}

export default AddRecipePage
