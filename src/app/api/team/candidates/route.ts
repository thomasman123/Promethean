import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

interface Candidate {
  id: string
  name: string | null
  role: 'rep' | 'setter'
  invited: boolean
}

// Normalize role strings to canonical set
function normalizeRole(role: string | null | undefined): 'admin' | 'moderator' | 'sales_rep' | 'setter' | null {
  if (!role) return null
  const r = role.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_')
  if (r === 'rep') return 'sales_rep'
  if (['owner', 'manager', 'team_lead', 'teamlead', 'lead', 'leader'].includes(r)) return 'admin'
  if (['admin', 'moderator', 'sales_rep', 'setter'].includes(r)) return r as any
  return null
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

      if (!access || !['admin', 'moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Get all active team members for this account (invited app users only)
    const { data: team, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching team members:', error)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Build a set of existing team member IDs for fast lookup
    const teamMemberIds = new Set<string>((team || []).map((m: any) => m.user_id))

    // Split into reps and setters based on normalized role
    const invitedReps = (team || [])
      .filter(m => {
        const nr = normalizeRole((m as any).role)
        return nr && ['sales_rep', 'admin'].includes(nr)
      })
      .map<Candidate>(m => ({ 
        id: (m as any).user_id, 
        name: (((m as any).full_name as string | null)?.trim() || (m as any).email || 'Unknown'), 
        role: 'rep', 
        invited: true 
      }))

    const invitedSetters = (team || [])
      .filter(m => {
        const nr = normalizeRole((m as any).role)
        return nr && ['setter', 'admin'].includes(nr)
      })
      .map<Candidate>(m => ({ 
        id: (m as any).user_id, 
        name: (((m as any).full_name as string | null)?.trim() || (m as any).email || 'Unknown'), 
        role: 'setter', 
        invited: true 
      }))

    // Find reps/setters that appear in appointments but are not in team_members
    const { data: apptUsers, error: apptErr } = await supabase
      .from('appointments')
      .select('setter_user_id, sales_rep_user_id')
      .eq('account_id', accountId)
      .or('setter_user_id.not.is.null,sales_rep_user_id.not.is.null')

    if (apptErr) {
      console.warn('Failed to fetch appointment users:', apptErr)
    }

    const missingSetterIds = new Set<string>()
    const missingRepIds = new Set<string>()

    for (const a of (apptUsers || []) as Array<{ setter_user_id: string | null, sales_rep_user_id: string | null }>) {
      if (a.setter_user_id && !teamMemberIds.has(a.setter_user_id)) missingSetterIds.add(a.setter_user_id)
      if (a.sales_rep_user_id && !teamMemberIds.has(a.sales_rep_user_id)) missingRepIds.add(a.sales_rep_user_id)
    }

    // Fetch profiles for missing IDs
    const missingIds = Array.from(new Set<string>([...missingSetterIds, ...missingRepIds]))
    let missingProfiles: Array<{ id: string; full_name: string | null; email: string | null }> = []
    if (missingIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', missingIds)
      missingProfiles = profilesData || []
    }

    const profileById = new Map<string, { id: string; full_name: string | null; email: string | null }>()
    for (const p of missingProfiles) profileById.set(p.id, p)

    const uninvitedSetters: Candidate[] = Array.from(missingSetterIds).map(id => {
      const p = profileById.get(id)
      return {
        id,
        name: (p?.full_name?.trim() || p?.email || 'Unknown') ?? 'Unknown',
        role: 'setter',
        invited: false,
      }
    })

    const uninvitedReps: Candidate[] = Array.from(missingRepIds).map(id => {
      const p = profileById.get(id)
      return {
        id,
        name: (p?.full_name?.trim() || p?.email || 'Unknown') ?? 'Unknown',
        role: 'rep',
        invited: false,
      }
    })

    // Combine and return
    return NextResponse.json({
      reps: [...invitedReps, ...uninvitedReps],
      setters: [...invitedSetters, ...uninvitedSetters]
    })
  } catch (e) {
    console.error('team/candidates error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 