// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'

// Admin-only routes
const ADMIN_PATHS = [/^\/dashboard(\/|$)/, /^\/print(\/|$)/]

// Logged-in user routes (non-admin area)
const USER_PATHS = [
  /^\/add-recipe(\/|$)/,
  /^\/profile(\/|$)/,
  /^\/checkout(\/|$)/,
]

// Register flow routes
const REGISTER_AUTH_REQUIRED = [/^\/register\/complete(\/|$)/]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // const isRegisterRoute = pathname.startsWith('/register')
  // const isInviteApiRoute = pathname.startsWith('/api/private-invite')
  const isHandlerRoute = pathname.startsWith('/handler')

  // Read user ONCE
  const user = await stackServerApp.getUser({
    or: 'return-null',
    tokenStore: request,
  })

  /**
   * 0) HANDLER ROUTES
   * Logged-in users should NOT see /handler/*
   */
  if (user && isHandlerRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  /**
   * 1) REGISTER / INVITE ROUTES
   */
  // if (isRegisterRoute || isInviteApiRoute) {
  //   // 🚫 Logged-in users → redirect home
  //   if (user) {
  //     return NextResponse.redirect(new URL('/', request.url))
  //   }

  //   // 🔐 Logged-out users → /register/complete requires login
  //   if (pathname.startsWith('/register/complete')) {
  //     const signInUrl = new URL('/handler/sign-in', request.url)
  //     signInUrl.searchParams.set('after_auth_return_to', pathname)
  //     return NextResponse.redirect(signInUrl)
  //   }

  //   // ✅ Public register + invite routes
  //   return NextResponse.next()
  // }

  /**
   * 2) NORMAL AUTH RULES
   */
  const needsAdmin = ADMIN_PATHS.some((re) => re.test(pathname))
  const isUserRoute = USER_PATHS.some((re) => re.test(pathname))

  const needsAuth =
    needsAdmin || isUserRoute || REGISTER_AUTH_REQUIRED.some((re) => re.test(pathname))

  // Public route
  if (!needsAuth) {
    return NextResponse.next()
  }

  // Needs auth but user not logged in
  if (!user) {
    const signInUrl = new URL('/handler/sign-in', request.url)
    signInUrl.searchParams.set('after_auth_return_to', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Determine admin once (only when logged in AND needed)
  const isAdminUser = await checkAdminPermission(user)

  /**
   * ✅ New rule:
   * If user is admin and tries to access USER_PATHS → send to /dashboard
   */
  if (isAdminUser && isUserRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  /**
   * Admin-only protection:
   * If route needs admin and user isn't admin → send to /
   */
  if (needsAdmin && !isAdminUser) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Admin
    '/dashboard/:path*',
    '/print/:path*',

    // Logged-in user
    '/add-recipe/:path*',
    '/profile/:path*',
    '/checkout/:path*',

    // Register flow
    '/register/:path*',

    // Invite APIs
    '/api/private-invite/:path*',

    // Stack handlers
    '/handler/:path*',
  ],
}
