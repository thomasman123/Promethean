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

    // Invited team members
    const { data: team, error: teamErr } = await supabase
      .from('team_members')
      .select('user_id, full_name, role')
      .eq('account_id', accountId)

    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 400 })

    const invitedReps = (team || [])
      .filter(m => m.role === 'sales_rep')
      .map<Candidate>(m => ({ id: (m as any).user_id, name: (m as any).full_name || null, role: 'rep', invited: true }))

    const invitedSetters = (team || [])
      .filter(m => m.role === 'setter')
      .map<Candidate>(m => ({ id: (m as any).user_id, name: (m as any).full_name || null, role: 'setter', invited: true }))

    // IDs appearing in activity tables
    const repIds = new Set<string>()
    const repNames = new Map<string, string | null>()
    const setterIds = new Set<string>()
    const setterNames = new Map<string, string | null>()

    // Get account GHL API details for name lookups
    const { data: account } = await supabase
      .from('accounts')
      .select('ghl_api_key, ghl_location_id')
      .eq('id', accountId)
      .single()

    const [dialsRes, discoveriesRes, apptsRes] = await Promise.all([
      supabase.from('dials').select('setter_user_id, setter, setter_ghl_id, sales_rep_ghl_id').eq('account_id', accountId),
      supabase.from('discoveries').select('setter_user_id, sales_rep_user_id, setter, sales_rep, setter_ghl_id, sales_rep_ghl_id').eq('account_id', accountId),
      supabase.from('appointments').select('sales_rep_user_id, setter_user_id, sales_rep, setter, setter_ghl_id, sales_rep_ghl_id').eq('account_id', accountId)
    ])

    // Helper function to get name from GHL API
    const getGHLUserName = async (ghlUserId: string): Promise<string | null> => {
      if (!account?.ghl_api_key || !ghlUserId) return null
      
      try {
        const response = await fetch(`https://services.leadconnectorhq.com/users/${ghlUserId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
            'Accept': 'application/json',
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          return userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || null
        }
      } catch (error) {
        console.warn(`Failed to fetch GHL user name for ${ghlUserId}:`, error)
      }
      
      return null
    }

    // Collect all unique GHL IDs for batch lookup
    const ghlUserIds = new Set<string>()
    const allData = [...(dialsRes.data || []), ...(discoveriesRes.data || []), ...(apptsRes.data || [])]
    
    allData.forEach((r: any) => {
      if (r.setter_ghl_id) ghlUserIds.add(r.setter_ghl_id)
      if (r.sales_rep_ghl_id) ghlUserIds.add(r.sales_rep_ghl_id)
    })

    // Fetch names for all GHL IDs in parallel
    const ghlNameMap = new Map<string, string | null>()
    if (account?.ghl_api_key && ghlUserIds.size > 0) {
      const namePromises = Array.from(ghlUserIds).map(async (ghlId) => {
        const name = await getGHLUserName(ghlId)
        return [ghlId, name] as [string, string | null]
      })
      
      const nameResults = await Promise.all(namePromises)
      nameResults.forEach(([ghlId, name]) => {
        if (name) ghlNameMap.set(ghlId, name)
      })
    }

    const add = (id: string | null, name: string | null, type: 'rep' | 'setter', ghlId?: string | null) => {
      if (!id) return
      
      // Use GHL name if available, otherwise fall back to provided name
      let displayName = name
      if (ghlId && ghlNameMap.has(ghlId)) {
        displayName = ghlNameMap.get(ghlId) || name
      }
      
      if (type === 'rep') {
        repIds.add(id)
        if (displayName && !repNames.has(id)) repNames.set(id, displayName)
      } else {
        setterIds.add(id)
        if (displayName && !setterNames.has(id)) setterNames.set(id, displayName)
      }
    }

    ;(dialsRes.data || []).forEach((r: any) => {
      // Use user_id if available, otherwise use GHL ID, otherwise use name as ID
      if (r.setter_user_id || r.setter_ghl_id || r.setter) {
        add(r.setter_user_id || r.setter_ghl_id || `name:${r.setter}`, r.setter || null, 'setter', r.setter_ghl_id)
      }
      if (r.sales_rep_ghl_id) {
        add(r.sales_rep_ghl_id, r.setter || null, 'rep', r.sales_rep_ghl_id) // Name might not be available for sales rep in dials
      }
    })
    ;(discoveriesRes.data || []).forEach((r: any) => {
      // Use user_id if available, otherwise fall back to GHL ID, otherwise name-based ID
      if (r.setter_user_id || r.setter_ghl_id || r.setter) {
        add(r.setter_user_id || r.setter_ghl_id || `name:${r.setter}`, r.setter || null, 'setter', r.setter_ghl_id)
      }
      if (r.sales_rep_user_id || r.sales_rep_ghl_id || r.sales_rep) {
        add(r.sales_rep_user_id || r.sales_rep_ghl_id || `name:${r.sales_rep}`, r.sales_rep || null, 'rep', r.sales_rep_ghl_id)
      }
    })
    ;(apptsRes.data || []).forEach((r: any) => {
      // Use user_id if available, otherwise use GHL ID, otherwise use name as ID
      if (r.sales_rep_user_id || r.sales_rep_ghl_id || r.sales_rep) {
        add(r.sales_rep_user_id || r.sales_rep_ghl_id || `name:${r.sales_rep}`, r.sales_rep || null, 'rep', r.sales_rep_ghl_id)
      }
      if (r.setter_user_id || r.setter_ghl_id || r.setter) {
        add(r.setter_user_id || r.setter_ghl_id || `name:${r.setter}`, r.setter || null, 'setter', r.setter_ghl_id)
      }
    })

    const invitedRepIds = new Set(invitedReps.map(r => r.id))
    const invitedSetterIds = new Set(invitedSetters.map(s => s.id))

    const uninvitedReps: Candidate[] = Array.from(repIds)
      .filter(id => !invitedRepIds.has(id))
      .map(id => ({ 
        id, 
        name: repNames.get(id) || null, 
        role: 'rep', 
        invited: false 
      }))

    const uninvitedSetters: Candidate[] = Array.from(setterIds)
      .filter(id => !invitedSetterIds.has(id))
      .map(id => ({ 
        id, 
        name: setterNames.get(id) || null, 
        role: 'setter', 
        invited: false 
      }))

    return NextResponse.json({
      reps: [...invitedReps, ...uninvitedReps],
      setters: [...invitedSetters, ...uninvitedSetters]
    })
  } catch (e) {
    console.error('team/candidates error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 