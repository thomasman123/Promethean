import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const hostname = req.headers.get('host') || ''

  // Handle marketing site (www.getpromethean.com and getpromethean.com)
  if (hostname === 'www.getpromethean.com' || hostname === 'getpromethean.com') {
    // Allow webhook routes to pass through without redirect (for external services like GHL)
    if (pathname.startsWith('/api/webhook') || pathname.startsWith('/api/webhooks')) {
      return NextResponse.next()
    }

    // Always serve marketing page for root path (auth-aware buttons handled in component)
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/marketing', req.url))
    }

    // Redirect app routes to app subdomain
    if (pathname.startsWith('/login') || 
        pathname.startsWith('/signup') || 
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/account') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/data-view') ||
        pathname.startsWith('/follow-ups') ||
        pathname.startsWith('/update-data') ||
        pathname.startsWith('/playground')) {
      const appUrl = new URL(req.url)
      appUrl.hostname = 'app.getpromethean.com'
      return NextResponse.redirect(appUrl, 301)
    }
    
    // Let other marketing routes pass through normally
    return NextResponse.next()
  }

  // Handle app subdomain (app.getpromethean.com) - existing auth logic
  if (hostname === 'app.getpromethean.com' || hostname.includes('localhost') || hostname.includes('vercel.app')) {
    
    // Existing auth middleware logic for the app...
    
    let supabaseResponse = NextResponse.next({
      request: req,
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
              request: req,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Skip auth checks for password reset and forgot password routes
    // These routes need to handle their own Supabase auth flow
    if (pathname === '/reset-password' || pathname === '/forgot-password') {
      return supabaseResponse
    }

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const { data: { user } } = await supabase.auth.getUser()

    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/account', '/data-view', '/follow-ups', '/update-data']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    // Admin-only routes
    const adminRoutes = ['/playground']
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

    if (isProtectedRoute && !user) {
      // Redirect to login for protected routes
      const redirectUrl = new URL('/login', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    if (isAdminRoute) {
      if (!user) {
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Redirect authenticated users away from auth pages
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const redirectTo = searchParams.get('redirectTo') || '/dashboard'
      return NextResponse.redirect(new URL(redirectTo, req.url))
    }

    // Handle root redirect for app domain
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return supabaseResponse
  }

  // Default: let the request pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 