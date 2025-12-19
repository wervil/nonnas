import { NextResponse } from "next/server"
import { stackServerApp } from "@/stack"
import { checkAdminPermission } from "@/utils/checkAdminPermission"

export async function GET() {
  // Only admins can call this route
  const current = await stackServerApp.getUser({ or: "return-null" })
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = await checkAdminPermission(current)
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM || ""

  const page = await stackServerApp.listUsers({
    limit: 100,
    orderBy: "signedUpAt",
    desc: true,
  })

  const users = await Promise.all(
    page.map(async (u) => {
      // Get the team from *this user object* (types match)
      const team = await u.getTeam(teamId)

      // If user isn't in the team -> role user
      if (!team) {
        return {
          id: u.id,
          displayName: u.displayName ?? null,
          primaryEmail: u.primaryEmail ?? null,
          signedUpAt: u.signedUpAt ?? null,
          role: "user",
        }
      }

      // If user has team_member permission -> admin role
      const perm = await u.getPermission(team, "team_member")
      const role = perm ? "team_member" : "user"

      return {
        id: u.id,
        displayName: u.displayName ?? null,
        primaryEmail: u.primaryEmail ?? null,
        signedUpAt: u.signedUpAt ?? null,
        role,
      }
    })
  )

  return NextResponse.json({ users, nextCursor: page.nextCursor })
}
