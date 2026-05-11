import { stackServerApp } from "@/stack";

const SUPER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.toLowerCase() ?? "";
const SUPER_ADMIN_SEC_EMAIL =
  process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL?.toLowerCase() ?? "";

/**
 * Returns true if the given email belongs to a configured Super Admin.
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  const normalized = (email ?? "").toLowerCase();
  if (!normalized) return false;
  if (!SUPER_ADMIN_EMAIL && !SUPER_ADMIN_SEC_EMAIL) return false;
  return (
    normalized === SUPER_ADMIN_EMAIL || normalized === SUPER_ADMIN_SEC_EMAIL
  );
}

/**
 * Resolves the current authenticated user along with their Super Admin status.
 * Returns `{ user: null, isSuperAdmin: false }` when no user is logged in.
 */
export async function getCurrentUserWithSuperAdmin() {
  const user = await stackServerApp.getUser();
  if (!user) {
    return { user: null, isSuperAdmin: false } as const;
  }
  return {
    user,
    isSuperAdmin: isSuperAdminEmail(user.primaryEmail),
  } as const;
}
