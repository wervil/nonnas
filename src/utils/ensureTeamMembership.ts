export async function ensureTeamMembership(teamId: string, userId: string) {
    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!
    const serverKey = process.env.STACK_SECRET_SERVER_KEY!
  
    // This endpoint adds the user to the team (creates membership)
    const res = await fetch(
      `https://api.stack-auth.com/api/v1/team-memberships/${teamId}/${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Stack-Access-Type': 'server',
          'X-Stack-Project-Id': projectId,
          'X-Stack-Secret-Server-Key': serverKey,
        },
        body: JSON.stringify({}),
      }
    )
  
    // If already a member, Stack may return 409/200 depending on implementation.
    // Treat 200-299 as success; if 409, we can also ignore.
    if (!res.ok && res.status !== 409) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ensure membership failed: ${res.status} ${text}`)
    }
  }
  