import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { rejectUnauthorizedSignIn } from "@/utils/rejectUnauthorizedSignIn";

export async function GET(req: Request) {
  const user = await stackServerApp.getUser({
    or: "return-null",
    tokenStore: req,
  });

  if (!user) {
    return NextResponse.redirect(new URL("/handler/sign-in", req.url));
  }

  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM;
  if (!teamId) {
    console.error("sign-in-guard: NEXT_PUBLIC_STACK_TEAM is not set");
    return rejectUnauthorizedSignIn(req, user.id);
  }

  const team = await user.getTeam(teamId);

  if (!team) {
    return rejectUnauthorizedSignIn(req, user.id);
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
