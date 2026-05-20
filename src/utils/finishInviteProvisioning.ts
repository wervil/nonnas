import { ensureTeamMembership } from "@/utils/ensureTeamMembership";
import { revokeTeamPermission } from "@/utils/teamPermissions";

const TEAM_ID = process.env.NEXT_PUBLIC_STACK_TEAM!;
const ADMIN_PERMISSION_ID = "team_member";

export function isValidInviteToken(
  invite: string | undefined | null,
): boolean {
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? "";
  return Boolean(expected && invite && invite === expected);
}

/** Join invite user to the team as a non-admin member. */
export async function finishInviteProvisioning(userId: string): Promise<void> {
  await ensureTeamMembership(TEAM_ID, userId);
  await revokeTeamPermission(TEAM_ID, userId, ADMIN_PERMISSION_ID);
}
