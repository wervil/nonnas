// src/utils/grantAdminPermission.ts
export async function grantAdminPermission(
    teamId: string,
    userId: string,
    permissionId: string
  ) {
    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!
    const serverKey = process.env.STACK_SECRET_SERVER_KEY!
  
    const res = await fetch(
      `https://api.stack-auth.com/api/v1/team-permissions/${teamId}/${userId}/${permissionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Stack-Access-Type': 'server',
          'X-Stack-Project-Id': projectId,
          'X-Stack-Secret-Server-Key': serverKey,
        },
        // ✅ IMPORTANT: send valid JSON
        body: JSON.stringify({}),
      }
    )
  
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Grant failed: ${res.status} ${text}`)
    }
  }
  