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

function getSafeInternalAfterAuthPath(raw: string | null): string | null {
  if (raw == null || typeof raw !== 'string') return null
  let decoded: string
  try {
    decoded = decodeURIComponent(raw.trim())
  } catch {
    return null
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null
  if (decoded.includes('://')) return null
  return decoded
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isHandlerRoute = pathname.startsWith('/handler')

  // Read user ONCE
  const user = await stackServerApp.getUser({
    or: 'return-null',
    tokenStore: request,
  })

  /**
   * 0) HANDLER ROUTES (Stack Auth + oauth-callback, magic-link, etc.)
   * Do not redirect logged-in users to "/" — Stack often lands there after OAuth with
   * an active session, which skipped /api/auth/sign-in-guard entirely.
   */
  if (user && isHandlerRoute) {
    const afterPath = getSafeInternalAfterAuthPath(
      request.nextUrl.searchParams.get('after_auth_return_to'),
    )
    if (afterPath) {
      return NextResponse.redirect(new URL(afterPath, request.url))
    }

    const segment = pathname.match(/^\/handler\/([^/]+)/)?.[1] ?? ''

    if (segment === 'sign-in') {
      return NextResponse.redirect(new URL('/api/auth/sign-in-guard', request.url))
    }

    // sign-up may still be finishing (automaticRedirect). All other segments need StackHandler.
    return NextResponse.next()
  }

  /**
   * 0.25) INVITE SIGN-UP — always finish provisioning (and strip admin) while invite cookie is set.
   * Stack may auto-add the user to the team with admin before we run; do not skip when team exists.
   */
  if (user) {
    const inviteCookie = request.cookies.get('invite_token')?.value ?? ''
    const expected = process.env.NEXT_PUBLIC_STACK_ADMIN_INVITE_TOKEN ?? ''
    if (
      expected &&
      inviteCookie === expected &&
      pathname !== '/api/private-invite/complete'
    ) {
      return NextResponse.redirect(new URL('/api/private-invite/complete', request.url))
    }
  }

  /**
   * 0.3) HOME — non-invite sign-ins without team membership go through sign-in-guard.
   */
  if (user && pathname === '/') {
    const teamId = process.env.NEXT_PUBLIC_STACK_TEAM
    if (teamId) {
      const team = await user.getTeam(teamId)
      if (!team) {
        return NextResponse.redirect(new URL('/api/auth/sign-in-guard', request.url))
      }
    }
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
      const registerUrl = new URL('/register', request.url)
      const inviteParam = request.nextUrl.searchParams.get('invite')?.trim()
      if (inviteParam) registerUrl.searchParams.set('invite', inviteParam)
      return NextResponse.redirect(registerUrl)
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
    '/',

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
