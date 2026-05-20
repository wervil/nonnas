import { isSuperAdminEmail } from "@/lib/super-admin";
import type { CurrentServerUser } from "@stackframe/stack";

const TEAM_ID = process.env.NEXT_PUBLIC_STACK_TEAM || "";
const ADMIN_PERMISSION_ID = "team_member";

export const checkAdminPermission = async (user: CurrentServerUser) => {
  if (isSuperAdminEmail(user.primaryEmail)) {
    return true;
  }

  if (!TEAM_ID) {
    console.error("NEXT_PUBLIC_STACK_TEAM is not set");
    return false;
  }

  const team = await user.getTeam(TEAM_ID);
  if (!team) return false;

  const permission = await user.getPermission(team, ADMIN_PERMISSION_ID);
  return permission?.id === ADMIN_PERMISSION_ID;
}
