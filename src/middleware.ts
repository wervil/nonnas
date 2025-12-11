// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'

// Routes that ONLY admins can access
const ADMIN_PATHS = [/^\/dashboard(\/|$)/, /^\/print(\/|$)/]

// Routes that ANY logged-in user can access
const USER_PATHS = [
  /^\/add-recipe(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/checkout(\/|$)/,
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAdmin = ADMIN_PATHS.some((re) => re.test(pathname))
  const needsAuth =
    needsAdmin || USER_PATHS.some((re) => re.test(pathname))

  // Not a protected route → allow
  if (!needsAuth) {
    return NextResponse.next()
  }

  // Check Stack session
  const user = await stackServerApp.getUser({
    or: 'return-null',
    tokenStore: request,
  })

  if (!user) {
    // Not logged in → redirect to Stack sign-in
    const signInUrl = new URL('/handler/sign-in', request.url)
    signInUrl.searchParams.set('after_auth_return_to', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // If route needs admin, check permissions
  if (needsAdmin) {
    const isAdmin = await checkAdminPermission(user)

    if (!isAdmin) {
      // Logged in but not admin → send somewhere safe
      return NextResponse.redirect(new URL('/', request.url))
      // or new URL('/', request.url) if you prefer home
    }
  }

  // Auth (and role) OK → continue
  return NextResponse.next()
}

// Run middleware on these routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/print/:path*',
    '/add-recipe/:path*',
    '/profile/:path*',
    '/checkout/:path*',
  ],
}
