import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import {
  deleteStackUser,
  getStackUser,
  StackUserFromAdminApi,
} from "@/utils/stackAdmin";

function parseCreatedAtMs(u: StackUserFromAdminApi): number | null {
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

  // ✅ CHANGE: if NOT team member AND account is old -> redirect to '/'
  if (!team) {
    console.log("🚫 User NOT in team — deciding redirect based on account age");
    const userId = user.id;

    // Fetch full user to get signed_up_at_millis
    let createdAtMs: number | null = null;
    try {
      console.log("🔍 Fetching full Stack user for age check");
      const fullUser = await getStackUser(userId);
      createdAtMs = parseCreatedAtMs(fullUser);
      console.log("📅 createdAtMs:", createdAtMs);
    } catch (e) {
      console.error("❌ Failed to fetch Stack user for age check:", e);
    }

    const now = Date.now();
    const ageMs = createdAtMs != null ? now - createdAtMs : null;
    console.log("⏱ ageMs:", ageMs);

    // Define "old account" threshold
    const OLD_THRESHOLD_MS = 30_000; // 30s (change if you want)
    const isOldAccount = ageMs != null && ageMs > OLD_THRESHOLD_MS;

    if (isOldAccount) {
      console.log("🏠 Old account + not in team -> redirecting to '/'");
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Fresh/unknown-age account -> cleanup + optional delete + redirect to sign-in with error
    console.log("🧹 Fresh or unknown-age account -> redirect to sign-in + cleanup cookies");

    const url = new URL("/handler/sign-in", req.url);
    url.searchParams.set("error", "user_not_found");

    const res = NextResponse.redirect(url);

    // ✅ Force logout by clearing Stack cookies
    clearStackCookies(req, res);
    console.log("🍪 Cleared stack-access / stack-refresh-* cookies");

    // ✅ Optional: delete if account is very fresh (<= 30s)
    try {
      if (ageMs != null && ageMs >= 0 && ageMs <= OLD_THRESHOLD_MS) {
        console.log("🧨 Deleting user (age <= threshold):", userId);
        await deleteStackUser(userId);
        console.log("✅ Deleted user:", userId);
      } else {
        console.log("ℹ️ Not deleting: age unknown or older than threshold");
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
