import { stackServerApp } from "@/stack";
import { checkAdminPermission } from "@/utils/checkAdminPermission";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Only admins can call this route
  const current = await stackServerApp.getUser({ or: "return-null" });
  if (!current)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await checkAdminPermission(current);
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "5");

  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM || "";

  // For now, get all users and implement pagination on the frontend
  // Stack API doesn't seem to support offset-based pagination in this version
  const allUsers = await stackServerApp.listUsers({
    limit: 1000, // Get a large number to paginate on frontend
    orderBy: "signedUpAt",
    desc: true,
  });

  // Implement manual pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = allUsers.slice(startIndex, endIndex);

  const users = await Promise.all(
    paginatedUsers.map(async (u) => {
      // Get the team from *this user object* (types match)
      const team = await u.getTeam(teamId);

      // If user isn't in the team -> role user
      if (!team) {
        return {
          id: u.id,
          displayName: u.displayName ?? null,
          primaryEmail: u.primaryEmail ?? null,
          signedUpAt: u.signedUpAt ?? null,
          role: "user",
        };
      }

      // If user has team_member permission -> admin role
      const perm = await u.getPermission(team, "team_member");
      const role = perm ? "team_member" : "user";

      return {
        id: u.id,
        displayName: u.displayName ?? null,
        primaryEmail: u.primaryEmail ?? null,
        signedUpAt: u.signedUpAt ?? null,
        role,
      };
    }),
  );

  const totalPages = Math.ceil(allUsers.length / limit);

  return NextResponse.json({
    users,
    pagination: {
      page,
      limit,
      totalCount: allUsers.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
