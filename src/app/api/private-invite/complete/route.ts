import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stackServerApp } from "@/stack";
import {
  finishInviteProvisioning,
  isValidInviteToken,
} from "@/utils/finishInviteProvisioning";

export async function GET(req: Request) {
  const user = await stackServerApp.getUser({
    or: "return-null",
    tokenStore: req,
  });

  if (!user) {
    const signIn = new URL("/handler/sign-in", req.url);
    signIn.searchParams.set("after_auth_return_to", "/");
    return NextResponse.redirect(signIn);
  }

  const cookieStore = await cookies();
  const invite = cookieStore.get("invite_token")?.value;

  if (!isValidInviteToken(invite)) {
    return NextResponse.redirect(
      new URL("/register/error?code=invalid_invite", req.url),
    );
  }

  try {
    await finishInviteProvisioning(user.id);
  } catch (e) {
    console.error("private-invite/complete failed:", e);
    const errUrl = new URL("/register/error", req.url);
    errUrl.searchParams.set("code", "provisioning_failed");
    const res = NextResponse.redirect(errUrl);
    res.cookies.set("invite_token", "", { path: "/", maxAge: 0 });
    return res;
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("invite_token", "", { path: "/", maxAge: 0 });
  return res;
}
