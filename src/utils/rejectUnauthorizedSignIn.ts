import { NextResponse } from "next/server";
import { deleteStackUser } from "@/utils/stackAdmin";
import { clearStackCookies } from "@/utils/stackAuthCookies";

/**
 * Block sign-in for Stack users who are not members of the app team.
 * OAuth may auto-create accounts; those are removed so only pre-provisioned users can sign in.
 */
export async function rejectUnauthorizedSignIn(
  req: Request,
  userId: string,
): Promise<NextResponse> {
  const url = new URL("/handler/sign-in", req.url);
  url.searchParams.set("error", "user_not_found");

  const res = NextResponse.redirect(url);
  clearStackCookies(req, res);

  try {
    await deleteStackUser(userId);
  } catch (e) {
    console.error("Failed to delete unauthorized Stack user:", userId, e);
  }

  return res;
}
