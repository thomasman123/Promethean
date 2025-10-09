import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Admin endpoint to manually trigger user linking for appointments/discoveries
 * This links sales_rep/setter names to user IDs via account_access matching
 */
export async function POST(request: NextRequest) {
  console.log('🔗 [admin-link-users] Starting user linking process')

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
      console.error('❌ [admin-link-users] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.log('❌ [admin-link-users] Admin access denied for user:', user.id)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ [admin-link-users] Admin access verified')

    // Use service role to execute the linking function
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

    // Call the database function to link users
    const { data: result, error: linkError } = await serviceSupabase
      .rpc('link_appointment_discovery_users' as any)

    if (linkError) {
      console.error('❌ [admin-link-users] Error linking users:', linkError)
      return NextResponse.json({ 
        error: 'Failed to link users', 
        details: linkError.message 
      }, { status: 500 })
    }

    console.log('✅ [admin-link-users] User linking complete:', result)

    return NextResponse.json({ 
      success: true,
      message: 'User linking completed successfully',
      stats: {
        appointments_sales_reps_linked: result?.appointments_sales_reps_linked || 0,
        appointments_setters_linked: result?.appointments_setters_linked || 0,
        discoveries_setters_linked: result?.discoveries_setters_linked || 0
      }
    })

  } catch (error: any) {
    console.error('❌ [admin-link-users] Unexpected error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

