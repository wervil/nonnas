// app/api/private-invite/start/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url);
  const invite = url.searchParams.get("invite")?.trim() ?? "";
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? ""; // server-only env

  if (!expected || invite !== expected) {
    const errorUrl = new URL("/register/error", url.origin);
    errorUrl.searchParams.set("code", invite ? "invalid_invite" : "missing_invite");
    return NextResponse.redirect(errorUrl);
  }

  const signupUrl = new URL("/handler/sign-up", url.origin);
  signupUrl.searchParams.set("after_auth_return_to", "/");

  const res = NextResponse.redirect(signupUrl);

  res.cookies.set("invite_token", invite, {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 60 * 15,
  });

  return res;
}
