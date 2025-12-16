// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'

const ADMIN_PATHS = [/^\/dashboard(\/|$)/, /^\/print(\/|$)/]

const USER_PATHS = [
  /^\/add-recipe(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/checkout(\/|$)/,
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAdmin = ADMIN_PATHS.some((re) => re.test(pathname))
  const needsAuth = needsAdmin || USER_PATHS.some((re) => re.test(pathname))

  // ❗ terms-of-use and privacy are NOT in these patterns
  if (!needsAuth) {
    return NextResponse.next()
  }

  const user = await stackServerApp.getUser({
    or: 'return-null',
    tokenStore: request,
  })

  if (!user) {
    const signInUrl = new URL('/handler/sign-in', request.url)
    signInUrl.searchParams.set('after_auth_return_to', pathname)
    return NextResponse.redirect(signInUrl)
  }

  if (needsAdmin) {
    const isAdmin = await checkAdminPermission(user)
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/print/:path*',
    '/add-recipe/:path*',
    '/profile/:path*',
    '/checkout/:path*',
    // ❌ DO NOT include /terms-of-use or /privacy here
  ],
}
