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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    // Verify user authentication and permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is global admin or account moderator
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profile?.role === 'admin'
    
    if (!isGlobalAdmin) {
      // Check for account-level access
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()

      if (!access || !['admin', 'moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get uninvited GHL users from the centralized table
    const { data: ghlUsers, error: ghlError } = await supabase
      .from('ghl_users' as any)
      .select('*')
      .eq('account_id', accountId)
      .eq('is_invited', false)
      .gt('activity_count', 0) // Only users with activity

    if (ghlError) {
      console.error('Error fetching GHL users:', ghlError)
      return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 })
    }

    // Format the response
    const pendingUsers = (ghlUsers || []).map((user: any) => ({
      ghl_user_id: user.ghl_user_id,
      name: user.name,
      email: user.email,
      primary_role: user.primary_role,
      roles: user.roles || [],
      activity_count: user.activity_count,
      setter_activity_count: user.setter_activity_count || 0,
      sales_rep_activity_count: user.sales_rep_activity_count || 0,
      last_seen_at: user.last_seen_at
    }))

    return NextResponse.json({
      pendingUsers,
      count: pendingUsers.length
    })
  } catch (e) {
    console.error('pending-ghl-users error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 