const STACK_API_BASE = "https://api.stack-auth.com/api/v1";

export type StackUserFromAdminApi = {
    id: string;
    display_name?: string | null;
    primary_email?: string | null;
    primary_email_verified?: boolean;
    profile_image_url?: string | null;
  
    // Important timestamps
    signed_up_at_millis?: number | null;
    last_active_at_millis?: number | null;
  
    // Team info
    selected_team_id?: string | null;
  
    // Auth flags
    has_password?: boolean;
    is_anonymous?: boolean;
  };
  

function getAdminHeaders() {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const serverKey = process.env.STACK_SECRET_SERVER_KEY;

  if (!projectId || !serverKey) {
    throw new Error("Missing STACK_PROJECT_ID or STACK_SECRET_SERVER_KEY");
  }

  return {
    "Content-Type": "application/json",
    "X-Stack-Access-Type": "server",
    "X-Stack-Project-Id": projectId,
    "X-Stack-Secret-Server-Key": serverKey,
  } as const;
}

export async function getStackUser(
  userId: string
): Promise<StackUserFromAdminApi> {
  const res = await fetch(
    `${STACK_API_BASE}/users/${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: getAdminHeaders(),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch Stack user: ${res.status} ${text}`);
  }

  return (await res.json()) as StackUserFromAdminApi;
}


export async function deleteStackUser(userId: string) {
    const res = await fetch(
      `https://api.stack-auth.com/api/v1/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: {
          "X-Stack-Access-Type": "server",
          "X-Stack-Project-Id": process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
          "X-Stack-Secret-Server-Key": process.env.STACK_SECRET_SERVER_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // ✅ IMPORTANT: avoid BODY_PARSING_ERROR
        cache: "no-store",
      }
    );
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to delete Stack user: ${res.status} ${text}`);
    }
  }
  
