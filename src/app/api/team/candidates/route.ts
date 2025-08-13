import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

interface Candidate {
  id: string
  name: string | null
  role: 'rep' | 'setter'
  invited: boolean
}

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

      if (!access || !['moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get invited team members first
    const { data: team, error: teamErr } = await supabase
      .from('team_members')
      .select('user_id, full_name, role')
      .eq('account_id', accountId)

    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 400 })

    // Create candidates from invited team members
    const invitedReps = (team || [])
      .filter(m => m.role === 'sales_rep')
      .map<Candidate>(m => ({ 
        id: (m as any).user_id, 
        name: (m as any).full_name || null, 
        role: 'rep', 
        invited: true 
      }))

    const invitedSetters = (team || [])
      .filter(m => m.role === 'setter')
      .map<Candidate>(m => ({ 
        id: (m as any).user_id, 
        name: (m as any).full_name || null, 
        role: 'setter', 
        invited: true 
      }))

    // First, sync existing GHL users from data tables to ensure ghl_users table is up to date
    try {
      // Use raw SQL since the function isn't in types yet
      await supabase.rpc('sync_ghl_users_from_existing_data' as any, { p_account_id: accountId })
    } catch (syncError) {
      console.warn('Failed to sync GHL users:', syncError)
      // Continue anyway - this is not critical
    }

    // Get all GHL users from the centralized table using raw SQL query
    const { data: ghlUsers, error: ghlError } = await supabase
      .from('ghl_users' as any)
      .select('*')
      .eq('account_id', accountId)
      .gt('activity_count', 0) // Only users with activity

    if (ghlError) {
      console.error('Error fetching GHL users:', ghlError)
      // Fall back to old method if ghl_users table doesn't work
      return NextResponse.json({
        reps: [...invitedReps],
        setters: [...invitedSetters]
      })
    }

    // Create candidates from GHL users
    const invitedUserIds = new Set([
      ...invitedReps.map(r => r.id),
      ...invitedSetters.map(s => s.id)
    ])

    const ghlReps: Candidate[] = []
    const ghlSetters: Candidate[] = []

    if (ghlUsers && Array.isArray(ghlUsers)) {
      ghlUsers.forEach((ghlUser: any) => {
        // Skip if they're already invited app users
        if (ghlUser.app_user_id && invitedUserIds.has(ghlUser.app_user_id)) {
          return
        }

        const candidate: Candidate = {
          id: ghlUser.ghl_user_id, // Use GHL ID as the filter ID
          name: ghlUser.name,
          role: ghlUser.primary_role === 'sales_rep' || ghlUser.primary_role === 'admin' || ghlUser.primary_role === 'moderator' ? 'rep' : 'setter',
          invited: ghlUser.is_invited
        }

        if (candidate.role === 'rep') {
          ghlReps.push(candidate)
        } else {
          ghlSetters.push(candidate)
        }
      })
    }

    return NextResponse.json({
      reps: [...invitedReps, ...ghlReps],
      setters: [...invitedSetters, ...ghlSetters]
    })
  } catch (e) {
    console.error('team/candidates error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 