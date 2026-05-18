const STACK_API_BASE = "https://api.stack-auth.com/api/v1";

function getStackServerHeaders(): Record<string, string> {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const serverKey = process.env.STACK_SECRET_SERVER_KEY;

  if (!projectId || !serverKey) {
    throw new Error("Missing Stack server credentials");
  }

  return {
    "Content-Type": "application/json",
    "X-Stack-Access-Type": "server",
    "X-Stack-Project-Id": projectId,
    "X-Stack-Secret-Server-Key": serverKey,
  };
}

export async function grantTeamPermission(
  teamId: string,
  userId: string,
  permissionId: string,
): Promise<void> {
  const res = await fetch(
    `${STACK_API_BASE}/team-permissions/${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}/${encodeURIComponent(permissionId)}`,
    {
      method: "POST",
      headers: getStackServerHeaders(),
      body: JSON.stringify({}),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Grant permission failed: ${res.status} ${text}`);
  }
}

/** Revoke admin (or any) team permission. No-op if not granted. */
export async function revokeTeamPermission(
  teamId: string,
  userId: string,
  permissionId: string,
): Promise<void> {
  const res = await fetch(
    `${STACK_API_BASE}/team-permissions/${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}/${encodeURIComponent(permissionId)}`,
    {
      method: "DELETE",
      headers: getStackServerHeaders(),
      body: JSON.stringify({}),
      cache: "no-store",
    },
  );

  if (res.status === 404) return;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Revoke permission failed: ${res.status} ${text}`);
  }
}
