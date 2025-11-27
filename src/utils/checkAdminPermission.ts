import { CurrentServerUser } from '@stackframe/stack'

export const checkAdminPermission = async (user: CurrentServerUser) => {
  const team = await user.getTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
  if (team) {
    const permission = await user.getPermission(team, 'team_member')
    if (permission?.id === 'team_member') {
      return true
    }
    return false
  }
  return false
}
