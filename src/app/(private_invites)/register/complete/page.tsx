import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { stackServerApp } from '@/stack'
import { ensureTeamMembership } from '@/utils/ensureTeamMembership'
import { grantAdminPermission } from '@/utils/grantAdminPermission'

const TEAM_ID = process.env.NEXT_PUBLIC_STACK_TEAM!
const ADMIN_PERMISSION_ID = 'team_member'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await stackServerApp.getUser({ or: 'return-null' })
  if (!user) redirect('/handler/sign-in?after_auth_return_to=%2Fregister%2Fcomplete')

  const cookieStore = await cookies()
  const invite = cookieStore.get('invite_token')?.value
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? ''
  if (!invite || invite !== expected) notFound()

  // ✅ 1) ensure user is in team
  await ensureTeamMembership(TEAM_ID, user.id)

  // ✅ 2) grant permission
  await grantAdminPermission(TEAM_ID, user.id, ADMIN_PERMISSION_ID)

  // (clear cookie via route handler in Next 15 if you want)
  redirect('/dashboard')
}
