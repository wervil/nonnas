// app/api/private-invite/start/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const invite = url.searchParams.get('invite')?.trim() ?? ''
  const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? '' // server-only env

  if (!expected || invite !== expected) {
    return NextResponse.redirect(new URL('/404', url.origin))
  }

  const res = NextResponse.redirect(new URL('/handler/sign-up?after_auth_return_to=%2Fadd-recipe', url.origin))

  res.cookies.set('invite_token', invite, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 15,
  })

  return res
}
