import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        ...profile
      }
    })
  } catch (error) {
    console.error('Session API error:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
} 