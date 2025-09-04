import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Skip cookie cleanup check for auth routes to prevent loops
  const isAuthRoute = req.nextUrl.pathname.includes('/login') || 
                      req.nextUrl.pathname.includes('/api/auth') ||
                      req.nextUrl.pathname.includes('/signup')
  
  // Only check for corrupted cookies on non-auth routes
  if (!isAuthRoute) {
    const hasCorruptedCookies = req.cookies.getAll().some(cookie => 
      cookie.value.startsWith('base64-') && cookie.name.startsWith('sb-')
    )
    
    // If corrupted cookies found and not already on cleanup route, redirect to cleanup
    if (hasCorruptedCookies && !req.nextUrl.pathname.includes('/api/auth/cleanup')) {
      return NextResponse.redirect(new URL('/api/auth/cleanup', req.url))
    }
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Try to get session and refresh if needed
  let session = null
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log('Middleware - Session error:', error.message)
    }
    session = data.session
    
    // If no session but we have cookies, try to refresh
    if (!session && req.cookies.getAll().some(c => c.name.includes('sb-'))) {
      console.log('Middleware - Attempting session refresh...')
      const { data: refreshData } = await supabase.auth.refreshSession()
      session = refreshData.session
    }
  } catch (error) {
    console.log('Middleware - Error getting session:', error)
    // If there's an error getting session and it might be due to corrupted cookies
    if (error instanceof Error && error.message.includes('JSON')) {
      return NextResponse.redirect(new URL('/api/auth/cleanup', req.url))
    }
  }

  // If a password recovery is in progress, force user to the reset page until cleared
  const recoveryPending = req.cookies.get('recovery_pending')?.value === '1'
  if (recoveryPending) {
    const path = req.nextUrl.pathname
    const isAllowed = path.startsWith('/reset-password') || path.startsWith('/api/auth/recovery')
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/reset-password', req.url))
    }
  }

  // Debug: Only log for troubleshooting when needed
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware - Session exists:', !!session, 'Path:', req.nextUrl.pathname)
  }

  const isProtectedRoute = (path: string) => {
    const publicPaths = ['/login', '/signup', '/auth', '/auth/callback', '/auth/supabase-callback', '/api/auth/callback']
    return !publicPaths.some(publicPath => path.startsWith(publicPath))
  }

  // Allow public routes
  if (!isProtectedRoute(req.nextUrl.pathname)) {
    return supabaseResponse
  }

  // Check if authenticated for protected routes
  if (!session && isProtectedRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Allow access to landing page (/) for everyone and to reset-password
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/reset-password' || req.nextUrl.pathname === '/forgot-password') {
    return supabaseResponse
  }

  // Require authentication for dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Redirect to login if user is not authenticated and trying to access protected routes
  if (!session && (req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/account'))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Check admin access for admin routes
  if (session && req.nextUrl.pathname.startsWith('/admin')) {
    try {
      // Check if user is impersonating someone
      const impersonatedUserId = req.cookies.get('impersonate_user_id')?.value
      let effectiveUserId = session.user.id

      // If impersonating, check if the actual user is admin first
      if (impersonatedUserId) {
        const { data: actualProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (actualProfile?.role === 'admin') {
          effectiveUserId = impersonatedUserId
        }
      }

      // Get effective user profile to check role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', effectiveUserId)
        .single()

      if (error || !profile || profile.role !== 'admin') {
        console.log('Middleware - Admin access denied for user:', effectiveUserId, 'role:', profile?.role)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    } catch (error) {
      console.log('Middleware - Error checking admin access:', error)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Check moderator/admin access for account routes
  if (session && req.nextUrl.pathname.startsWith('/account')) {
    try {
      // Check if user is impersonating someone
      const impersonatedUserId = req.cookies.get('impersonate_user_id')?.value
      let effectiveUserId = session.user.id

      // If impersonating, check if the actual user is admin first
      if (impersonatedUserId) {
        const { data: actualProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (actualProfile?.role === 'admin') {
          effectiveUserId = impersonatedUserId
        }
      }

      // Get effective user profile to check role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', effectiveUserId)
        .single()

      if (error || !profile || (profile.role !== 'admin' && profile.role !== 'moderator')) {
        console.log('Middleware - Account access denied for user:', effectiveUserId, 'role:', profile?.role)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    } catch (error) {
      console.log('Middleware - Error checking account access:', error)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Redirect to dashboard if user is authenticated and trying to access auth pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/account/:path*',
    '/update-data/:path*',
    '/data-view',
    '/auth',
    '/login',
    '/signup',
  ],
} 