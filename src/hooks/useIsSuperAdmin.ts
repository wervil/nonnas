"use client";

import { useUser } from "@stackframe/stack";

/**
 * Returns true when the currently authenticated user matches one of the
 * configured Super Admin emails (NEXT_PUBLIC_SUPER_ADMIN_EMAIL or
 * NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL).
 *
 * Server-side enforcement still happens in the API routes — this hook is
 * intended only for showing/hiding super admin UI affordances.
 */
export function useIsSuperAdmin(): boolean {
  const user = useUser();

  const email = user?.primaryEmail?.toLowerCase() || "";
  if (!email) return false;

  const superEmail = (
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ""
  ).toLowerCase();
  const superSecEmail = (
    process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL || ""
  ).toLowerCase();

  if (!superEmail && !superSecEmail) return false;

  return email === superEmail || email === superSecEmail;
}
