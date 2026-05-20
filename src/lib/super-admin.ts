import { isSuperAdminEmail } from "@/lib/super-admin-emails";
import { stackServerApp } from "@/stack";
import { ensureTeamMembership } from "@/utils/ensureTeamMembership";
import { grantTeamPermission } from "@/utils/teamPermissions";

export {
  BUILTIN_SUPER_ADMIN_EMAILS,
  collectSuperAdminEmails,
  isSuperAdminEmail,
} from "@/lib/super-admin-emails";

const TEAM_ID = process.env.NEXT_PUBLIC_STACK_TEAM ?? "";
const ADMIN_PERMISSION_ID = "team_member";

/**
 * Best-effort: add super admin to the Stack team with team_member permission.
 */
export async function provisionSuperAdminAccess(
  userId: string,
  email?: string | null,
): Promise<void> {
  if (!isSuperAdminEmail(email) || !TEAM_ID) return;

  try {
    await ensureTeamMembership(TEAM_ID, userId);
    await grantTeamPermission(TEAM_ID, userId, ADMIN_PERMISSION_ID);
  } catch (e) {
    console.warn(
      "Super admin Stack provisioning skipped (env email still has full access):",
      e,
    );
  }
}

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
