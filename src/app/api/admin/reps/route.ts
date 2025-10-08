import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Admin endpoint to fetch all users/reps in the system
 */
export async function GET(request: NextRequest) {
  console.log('🔍 [admin-reps] Starting API call')

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

  try {
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ [admin-reps] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.log('❌ [admin-reps] Admin access denied for user:', user.id)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ [admin-reps] Admin access verified')

    // Use service role to fetch all users
    const serviceSupabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    const { data: users, error: usersError } = await serviceSupabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true })

    if (usersError) {
      console.error('❌ [admin-reps] Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const reps = (users || []).map((u: any) => ({
      id: u.id,
      name: u.full_name || u.email || 'Unknown',
      email: u.email,
      role: u.role
    }))

    console.log(`✅ [admin-reps] Found ${reps.length} users`)
    return NextResponse.json({ reps })

  } catch (error: any) {
    console.error('❌ [admin-reps] Unexpected error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

