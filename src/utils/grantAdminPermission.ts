// src/utils/grantAdminPermission.ts
import { grantTeamPermission } from "@/utils/teamPermissions";

export async function grantAdminPermission(
  teamId: string,
  userId: string,
  permissionId: string,
) {
  await grantTeamPermission(teamId, userId, permissionId);
}
  