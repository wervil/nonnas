import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stackServerApp } from "@/stack";
import { ensureTeamMembership } from "@/utils/ensureTeamMembership";
import { revokeTeamPermission } from "@/utils/teamPermissions";

const TEAM_ID = process.env.NEXT_PUBLIC_STACK_TEAM!;
const ADMIN_PERMISSION_ID = "team_member";

export async function GET(req: Request) {
  const user = await stackServerApp.getUser({
    or: "return-null",
    tokenStore: req,
  });

  if (!user) {
    const signIn = new URL("/handler/sign-in", req.url);
    signIn.searchParams.set(
      "after_auth_return_to",
      "/api/private-invite/complete",
    );
    return NextResponse.redirect(signIn);
  }

  const cookieStore = await cookies();
  const invite = cookieStore.get("invite_token")?.value;
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? "";

  if (!expected || !invite || invite !== expected) {
    return NextResponse.redirect(
      new URL("/register/error?code=invalid_invite", req.url),
    );
  }

  // Join team as client: membership yes, admin permission explicitly no.
  await ensureTeamMembership(TEAM_ID, user.id);
  await revokeTeamPermission(TEAM_ID, user.id, ADMIN_PERMISSION_ID);

  const res = NextResponse.redirect(new URL("/add-recipe", req.url));
  res.cookies.set("invite_token", "", { path: "/", maxAge: 0 });
  return res;
}
