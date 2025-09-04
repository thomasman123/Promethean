import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Log all cookies for debugging
    console.log('All cookies:', cookieStore.getAll().map(c => ({ name: c.name, valueStart: c.value.substring(0, 20) })))
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const value = cookieStore.get(name)?.value
            console.log(`Getting cookie ${name}:`, value ? 'exists' : 'not found')
            return value
          },
          set(name: string, value: string, options: any) {
            console.log(`Setting cookie ${name}`)
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            console.log(`Removing cookie ${name}`)
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json({ 
        error: 'Session error', 
        details: sessionError.message,
        cookies: cookieStore.getAll().length
      }, { status: 500 })
    }
    
    if (!session) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No session found',
        cookies: cookieStore.getAll().length
      })
    }
    
    // Try to get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('User error:', userError)
      return NextResponse.json({ 
        error: 'User error', 
        details: userError.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user?.id,
        email: user?.email
      },
      session: {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at
      }
    })
    
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ 
      error: 'Internal error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 