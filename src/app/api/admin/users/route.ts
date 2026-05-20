import { isSuperAdminEmail, provisionSuperAdminAccess } from "@/lib/super-admin";
import { stackServerApp } from "@/stack";
import { checkAdminPermission } from "@/utils/checkAdminPermission";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

  const allUsers = await stackServerApp.listUsers({
    limit: 1000,
    orderBy: "signedUpAt",
    desc: true,
  });

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = allUsers.slice(startIndex, endIndex);

  const users = await Promise.all(
    paginatedUsers.map(async (u) => {
      let role: "team_member" | "user" = "user";

      if (isSuperAdminEmail(u.primaryEmail)) {
        await provisionSuperAdminAccess(u.id, u.primaryEmail);
        role = "team_member";
      } else {
        const team = await u.getTeam(teamId);
        if (team) {
          const perm = await u.getPermission(team, "team_member");
          if (perm?.id === "team_member") role = "team_member";
        }
      }

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
