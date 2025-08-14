import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
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
  }

  // Debug: Only log for troubleshooting when needed
  if (process.env.NODE_ENV === 'development') {
    console.log('Middleware - Session exists:', !!session, 'Path:', req.nextUrl.pathname)
  }

  // Allow access to landing page (/) for everyone and to reset-password
  if (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/reset-password' || req.nextUrl.pathname === '/forgot-password') {
    return supabaseResponse
  }

  // Redirect to login if user is not authenticated and trying to access protected routes
  if (!session && (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin') || req.nextUrl.pathname.startsWith('/account'))) {
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
    '/login',
    '/signup',
  ],
} 