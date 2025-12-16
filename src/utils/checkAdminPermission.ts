// import { CurrentServerUser } from '@stackframe/stack'

// export const checkAdminPermission = async (user: CurrentServerUser) => {
//   const team = await user.getTeam(process.env.NEXT_PUBLIC_STACK_TEAM || '')
//   if (team) {
//     const permission = await user.getPermission(team, 'team_member')
//     if (permission?.id === 'team_member') {
//       return true
//     }
//     return false
//   }
//   return false
// }


// src/utils/checkAdminPermission.ts
import type { CurrentServerUser } from '@stackframe/stack'

const TEAM_ID = process.env.NEXT_PUBLIC_STACK_TEAM || ''
// 👇 change this only if your admin permission id is different in Stack
const ADMIN_PERMISSION_ID = 'team_member'

export const checkAdminPermission = async (user: CurrentServerUser) => {
  if (!TEAM_ID) {
    console.error('NEXT_PUBLIC_STACK_TEAM is not set')
    return false
  }

  // 1) Get the team using the env id
  const team = await user.getTeam(TEAM_ID)
  if (!team) return false

  // 2) Check if the user has the admin permission in that team
  const permission = await user.getPermission(team, ADMIN_PERMISSION_ID)

  // 3) Admin = has that permission
  return permission?.id === ADMIN_PERMISSION_ID
}
