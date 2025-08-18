import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

interface Candidate {
  id: string
  name: string | null
  role: 'rep' | 'setter'
  invited: boolean
}

// Normalize role strings to canonical set (kept for compatibility, not used to hard-lock)
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

    // Collect participants from data across roles (appointments, discoveries, dials)
    const [apptUsersRes, discUsersRes, dialUsersRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('setter_user_id, sales_rep_user_id')
        .eq('account_id', accountId)
        .or('setter_user_id.not.is.null,sales_rep_user_id.not.is.null'),
      supabase
        .from('discoveries')
        .select('setter_user_id, sales_rep_user_id')
        .eq('account_id', accountId)
        .or('setter_user_id.not.is.null,sales_rep_user_id.not.is.null'),
      supabase
        .from('dials')
        .select('setter_user_id')
        .eq('account_id', accountId)
        .not('setter_user_id', 'is', null as any)
    ])

    const apptUsers = apptUsersRes.data || []
    const discUsers = discUsersRes.data || []
    const dialUsers = dialUsersRes.data || []

    const participantIds = new Set<string>()
    // Include all invited users regardless of their stored role
    for (const id of teamMemberIds) participantIds.add(id)

    ;(apptUsers as Array<{ setter_user_id: string | null, sales_rep_user_id: string | null }>).forEach(a => {
      if (a.setter_user_id) participantIds.add(a.setter_user_id)
      if (a.sales_rep_user_id) participantIds.add(a.sales_rep_user_id)
    })
    ;(discUsers as Array<{ setter_user_id: string | null, sales_rep_user_id: string | null }>).forEach(d => {
      if (d.setter_user_id) participantIds.add(d.setter_user_id)
      if (d.sales_rep_user_id) participantIds.add(d.sales_rep_user_id)
    })
    ;(dialUsers as Array<{ setter_user_id: string | null }>).forEach(d => {
      if (d.setter_user_id) participantIds.add(d.setter_user_id)
    })

    // Fetch profiles for non-invited participants
    const allIds = Array.from(participantIds)
    const missingIds = allIds.filter(id => !teamMemberIds.has(id))

    let missingProfiles: Array<{ id: string; full_name: string | null; email: string | null }> = []
    if (missingIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', missingIds)
      missingProfiles = profilesData || []
    }

    const nameForTeamMember = (id: string) => {
      const m = (team || []).find((tm: any) => tm.user_id === id)
      return (((m?.full_name as string | null)?.trim()) || m?.email || 'Unknown') ?? 'Unknown'
    }

    const profileById = new Map<string, { id: string; full_name: string | null; email: string | null }>()
    for (const p of missingProfiles) profileById.set(p.id, p)

    const unifiedCandidates = allIds.map(id => {
      const invited = teamMemberIds.has(id)
      const name = invited 
        ? nameForTeamMember(id) 
        : ((profileById.get(id)?.full_name?.trim() || profileById.get(id)?.email || 'Unknown') ?? 'Unknown')
      return { id, name, invited }
    })

    // Return the same unified set in both lists so users who do both appear in both dropdowns
    const reps: Candidate[] = unifiedCandidates.map(c => ({ id: c.id, name: c.name, role: 'rep', invited: c.invited }))
    const setters: Candidate[] = unifiedCandidates.map(c => ({ id: c.id, name: c.name, role: 'setter', invited: c.invited }))

    return NextResponse.json({ reps, setters })
  } catch (e) {
    console.error('team/candidates error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 