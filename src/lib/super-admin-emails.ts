/** Always super admin (in addition to env-configured emails). */
export const BUILTIN_SUPER_ADMIN_EMAILS = ["wervil@gmail.com"] as const;

export function collectSuperAdminEmails(): string[] {
  const emails = new Set<string>();

  for (const raw of [
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_SUPER_ADMIN_SEC_EMAIL,
    ...(process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS?.split(",") ?? []),
    ...BUILTIN_SUPER_ADMIN_EMAILS,
  ]) {
    const normalized = raw?.trim().toLowerCase();
    if (normalized) emails.add(normalized);
  }

  return [...emails];
}

export function isSuperAdminEmail(email?: string | null): boolean {
  const normalized = (email ?? "").toLowerCase();
  if (!normalized) return false;
  return collectSuperAdminEmails().includes(normalized);
}
