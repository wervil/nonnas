import { NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'

const STACK_API_BASE = 'https://api.stack-auth.com/api/v1'

const SUPER_ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || process.env.SUPER_ADMIN_SEC_EMAIL?.toLowerCase() || ''
).toLowerCase()

function getStackServerHeaders(): Record<string, string> {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const serverKey = process.env.STACK_SECRET_SERVER_KEY // must start with ssk_

  if (!projectId) {
    throw new Error('Missing NEXT_PUBLIC_STACK_PROJECT_ID (server env)')
  }
  if (!serverKey) {
    throw new Error('Missing STACK_SECRET_SERVER_KEY (server env)')
  }

  return {
    'X-Stack-Access-Type': 'server',
    'X-Stack-Project-Id': projectId,
    'X-Stack-Secret-Server-Key': serverKey,
    Accept: 'application/json',
  }
}

async function deleteStackUser(userId: string): Promise<void> {
  const url = `${STACK_API_BASE}/users/${encodeURIComponent(userId)}`

  const res = await fetch(url, {
    method: 'DELETE',
    headers: getStackServerHeaders(),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Stack delete failed: ${res.status} ${text}`)
  }
}

export async function POST(req: Request) {
  try {
    // ✅ Server-side super admin check
    const user = await stackServerApp.getUser({
      or: 'return-null',
      tokenStore: req, // ✅ no `any`
    })

    const email = (user?.primaryEmail || '').toLowerCase()

    if (!SUPER_ADMIN_EMAIL || email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json().catch(() => null)) as
      | { userId?: string }
      | null

    const userId = body?.userId?.trim()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    await deleteStackUser(userId)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Unknown server error'

    console.error('Delete user route error:', e)

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
