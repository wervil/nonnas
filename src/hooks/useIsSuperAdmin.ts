"use client";

import { isSuperAdminEmail } from "@/lib/super-admin-emails";
import { useUser } from "@stackframe/stack";

export function useIsSuperAdmin(): boolean {
  const user = useUser();
  return isSuperAdminEmail(user?.primaryEmail);
}
