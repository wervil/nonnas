// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { stackServerApp } from '@/stack'
import { checkAdminPermission } from '@/utils/checkAdminPermission'

// Admin-only routes
const ADMIN_PATHS = [/^\/dashboard(\/|$)/, /^\/print(\/|$)/]

// Logged-in user routes (non-admin area)
const USER_PATHS = [
  // /^\/add-recipe(\/|$)/,
  /^\/checkout(\/|$)/,
]

// Routes open to any logged-in user (admin or normal)
const SHARED_AUTH_PATHS = [
  /^\/messages(\/|$)/,
  /^\/community\/thread(\/|$)/,
  /^\/profile(\/|$)/,
]

// Only allow viewing Stack signup if invite cookie is present
const SIGNUP_HANDLER_PATH = /^\/handler\/sign-up(\/|$)/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
   * 0.5) INVITE-ONLY SIGNUP GATE
   * If user is logged OUT and tries to open /handler/sign-up directly,
   * allow ONLY if invite_token cookie is valid.
   */
  if (!user && SIGNUP_HANDLER_PATH.test(pathname)) {
    const inviteCookie = request.cookies.get('invite_token')?.value ?? ''
    const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? '' // server-only env

    if (!expected || inviteCookie !== expected) {
      // Block signup page for non-invited users
      return NextResponse.redirect(new URL('/404', request.url)) // or '/register'
    }
  }

  /**
   * 1) NORMAL AUTH RULES
   */
  const needsAdmin = ADMIN_PATHS.some((re) => re.test(pathname))
  const isUserRoute = USER_PATHS.some((re) => re.test(pathname))
  const isSharedAuthRoute = SHARED_AUTH_PATHS.some((re) => re.test(pathname))
  const needsAuth = needsAdmin || isUserRoute || isSharedAuthRoute

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
    '/messages/:path*',
    '/community/thread/:path*',

    // Register flow (public)
    '/register/:path*',

    // Invite APIs
    '/api/private-invite/:path*',

    // Stack handlers
    '/handler/:path*',
  ],
}
