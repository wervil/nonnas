import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { deleteStackUser, getStackUser, StackUserFromAdminApi } from "@/utils/stackAdmin";

function parseCreatedAtMs(
  u: StackUserFromAdminApi
): number | null {
  const v = u.signed_up_at_millis;

  if (v == null) return null;
  return typeof v === "number" ? v : null;
}

function clearStackCookies(req: Request, res: NextResponse) {
  // Cookies you actually have (from your screenshot)
  res.cookies.set("stack-access", "", { path: "/", maxAge: 0 });
  res.cookies.set("stack-is-https", "", { path: "/", maxAge: 0 });

  // In case other variants exist
  res.cookies.set("__Secure-stack-access", "", { path: "/", maxAge: 0 });
  res.cookies.set("__Host-stack-access", "", { path: "/", maxAge: 0 });

  // Refresh cookie name is dynamic: stack-refresh-<id>
  const cookieHeader = req.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name?.startsWith("stack-refresh-")) {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }
}

export async function GET(req: Request) {
  console.log("🟢 sign-in-guard: request received");

  const user = await stackServerApp.getUser({
    or: "return-null",
    tokenStore: req,
  });

  if (!user) {
    console.log("🔴 No user in session -> redirect to /handler/sign-in");
    return NextResponse.redirect(new URL("/handler/sign-in", req.url));
  }

  console.log("👤 Stack user detected:", { id: user.id, email: user.primaryEmail });

  const teamId = process.env.NEXT_PUBLIC_STACK_TEAM!;
  console.log("🔎 Checking team membership:", teamId);

  const team = await user.getTeam(teamId);

  if (!team) {
    console.log("🚫 User NOT in team — will block + cleanup");
    const userId = user.id;

    // Redirect back to sign-in with error
    const url = new URL("/handler/sign-in", req.url);
    url.searchParams.set("error", "user_not_found");

    const res = NextResponse.redirect(url);

    // ✅ Force logout by clearing the REAL Stack cookies
    clearStackCookies(req, res);
    console.log("🍪 Cleared stack-access / stack-refresh-* cookies");

    // ✅ Optional: delete if account is very fresh
    try {
      console.log("🔍 Fetching full Stack user for age check");
      const fullUser = await getStackUser(userId);

      const createdAtMs = parseCreatedAtMs(fullUser);
      console.log("📅 createdAtMs:", createdAtMs);

      if (createdAtMs) {
        const ageMs = Date.now() - createdAtMs;
        console.log("⏱ ageMs:", ageMs);

        if (ageMs >= 0 && ageMs <= 30_000) {
          console.log("🧨 Deleting user (age <= 30s):", userId);
          await deleteStackUser(userId);
          console.log("✅ Deleted user:", userId);
        } else {
          console.log("ℹ️ Not deleting: user older than 30s");
        }
      } else {
        console.log("⚠️ Could not determine createdAt for deletion decision");
      }
    } catch (e) {
      console.error("❌ Deletion check failed (continuing anyway):", e);
    }

    console.log("↩️ Redirecting to:", url.toString());
    return res;
  }

  console.log("✅ User allowed — redirecting to dashboard");
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
