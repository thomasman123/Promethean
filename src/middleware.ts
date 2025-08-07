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

  // Debug: Log session and cookies for troubleshooting
  console.log('Middleware - Session exists:', !!session)
  console.log('Middleware - Path:', req.nextUrl.pathname)
  console.log('Middleware - All cookies:', req.cookies.getAll().map(c => c.name))
  console.log('Middleware - Auth cookies:', req.cookies.getAll().filter(c => c.name.includes('sb-')).map(c => c.name))

  // Allow access to landing page (/) for everyone
  if (req.nextUrl.pathname === '/') {
    return supabaseResponse
  }

  // Redirect to login if user is not authenticated and trying to access protected routes
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
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
    '/login',
    '/signup',
  ],
} 