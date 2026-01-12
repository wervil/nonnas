import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'

type RolePayload = {
  userId: string
  role: 'team_member' | 'client'
}

type ListUsersPage<T> = T[] & { nextCursor?: string | null }

async function findUserById(userId: string) {
  let cursor: string | undefined

  for (let i = 0; i < 50; i++) {
    const page = (await stackServerApp.listUsers({
      limit: 100,
      cursor,
    })) as unknown as ListUsersPage<unknown>

    const found = page.find((u) => (u as { id?: string }).id === userId)
    if (found) return found

    const nextCursor = page.nextCursor ?? null
    if (!nextCursor) break
    cursor = nextCursor
  }

  return null
}

/**
 * Attempts to add/remove a user to/from a team using whatever method
 * your SDK version exposes. If none exist, returns false.
 */
async function tryAddUserToTeam(serverTeam: unknown, userId: string): Promise<boolean> {
  const t = serverTeam as Record<string, unknown>

  // Common method names / signatures
  const candidates: Array<() => Promise<unknown>> = [
    // addUser(userId)
    () => (t.addUser as (id: string) => Promise<unknown>)(userId),
    // addMember(userId)
    () => (t.addMember as (id: string) => Promise<unknown>)(userId),
    // addUser({ userId })
    () => (t.addUser as (arg: { userId: string }) => Promise<unknown>)({ userId }),
    // addMember({ userId })
    () => (t.addMember as (arg: { userId: string }) => Promise<unknown>)({ userId }),
  ]

  for (const fn of candidates) {
    try {
      // only call if function exists
      const name = fn.toString()
      const keyMatch = name.match(/\(t\.(\w+)/)
      const key = keyMatch?.[1]
      if (key && typeof t[key] !== 'function') continue

      await fn()
      return true
    } catch {
      // try next
    }
  }

  return false
}

async function tryRemoveUserFromTeam(serverTeam: unknown, userId: string): Promise<boolean> {
  const t = serverTeam as Record<string, unknown>

  const candidates: Array<() => Promise<unknown>> = [
    // removeUser(userId)
    () => (t.removeUser as (id: string) => Promise<unknown>)(userId),
    // removeMember(userId)
    () => (t.removeMember as (id: string) => Promise<unknown>)(userId),
    // kickUser(userId)
    () => (t.kickUser as (id: string) => Promise<unknown>)(userId),
    // removeUser({ userId })
    () => (t.removeUser as (arg: { userId: string }) => Promise<unknown>)({ userId }),
    // removeMember({ userId })
    () => (t.removeMember as (arg: { userId: string }) => Promise<unknown>)({ userId }),
  ]

  for (const fn of candidates) {
    try {
      const name = fn.toString()
      const keyMatch = name.match(/\(t\.(\w+)/)
      const key = keyMatch?.[1]
      if (key && typeof t[key] !== 'function') continue

      await fn()
      return true
    } catch {
      // try next
    }
  }

  return false
}

export async function POST(req: Request) {
  const current = await stackServerApp.getUser({ or: 'return-null' })
  if (!current) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only SUPER ADMIN can change roles
  const superAdminEmail =
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() || process.env.SUPER_ADMIN_SEC_EMAIL?.toLowerCase() || ''
  const currentEmail = (current.primaryEmail || '').toLowerCase()

  if (!superAdminEmail || currentEmail !== superAdminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as RolePayload | null
  if (!body?.userId || !body?.role) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM || ''
  if (!teamId) {
    return NextResponse.json({ error: 'Missing team id' }, { status: 500 })
  }

  const target = await findUserById(body.userId)
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const targetUser = target as unknown as {
    id: string
    primaryEmail?: string | null
    getTeam: (teamId: string) => Promise<unknown | null>
    grantPermission: (team: unknown, permissionId: string) => Promise<void>
    revokePermission: (team: unknown, permissionId: string) => Promise<void>
  }

  const targetEmail = (targetUser.primaryEmail || '').toLowerCase()

  // Protect super admin from being modified
  if (targetEmail && targetEmail === superAdminEmail) {
    return NextResponse.json({ error: 'Cannot change Super Admin role' }, { status: 400 })
  }

  // Get server team (needed for membership add/remove attempts)
  const serverTeam = await stackServerApp.getTeam(teamId)
  if (!serverTeam) {
    return NextResponse.json({ error: 'Team not found' }, { status: 500 })
  }

  // Membership check
  let team = await targetUser.getTeam(teamId)

  // ===================== PROMOTE to team_member =====================
  if (body.role === 'team_member') {
    // If not in team, try to add directly
    if (!team) {
      const added = await tryAddUserToTeam(serverTeam, targetUser.id)

      if (!added) {
        return NextResponse.json(
          {
            error:
              'SDK does not support direct add-to-team. No addUser/addMember method found on ServerTeam.',
          },
          { status: 500 }
        )
      }

      // re-check membership
      team = await targetUser.getTeam(teamId)
      if (!team) {
        return NextResponse.json(
          { error: 'Failed to add user to team' },
          { status: 500 }
        )
      }
    }

    // Now grant permission
    await targetUser.grantPermission(team, 'team_member')
    return NextResponse.json({ success: true })
  }

  // ===================== DEMOTE to client =====================
  // revoke permission if in team, and then remove from team
  if (team) {
    await targetUser.revokePermission(team, 'team_member')
  }

  // remove from team if possible (even if team is null, we can still attempt remove by id)
  const removed = await tryRemoveUserFromTeam(serverTeam, targetUser.id)

  if (!removed) {
    // If SDK can't remove members, we still consider them "client" by permission revoke.
    // But you asked to remove from team, so we return a warning.
    return NextResponse.json(
      {
        success: true,
        warning:
          'Role updated (permission revoked), but SDK does not support direct remove-from-team. No removeUser/removeMember method found.',
      },
      { status: 200 }
    )
  }

  return NextResponse.json({ success: true })
}
