import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    if (!data.session) {
      return NextResponse.json({ error: 'No session created' }, { status: 400 })
    }
    
    // Create response
    const response = NextResponse.json({ 
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    })
    
    // The Supabase server client should have already set the cookies
    // Log what cookies were set for debugging
    const supabaseCookies = cookieStore.getAll().filter(c => c.name.startsWith('sb-'))
    console.log('Login - Supabase cookies set:', supabaseCookies.map(c => c.name))
    
    return response
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 