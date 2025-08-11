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

    // Invited team members
    const { data: team, error: teamErr } = await supabase
      .from('team_members')
      .select('user_id, full_name, role')
      .eq('account_id', accountId)

    if (teamErr) return NextResponse.json({ error: teamErr.message }, { status: 400 })

    const invitedReps = (team || [])
      .filter(m => m.role === 'rep' || m.role === 'sales' || m.role === 'closer')
      .map<Candidate>(m => ({ id: (m as any).user_id, name: (m as any).full_name || null, role: 'rep', invited: true }))

    const invitedSetters = (team || [])
      .filter(m => m.role === 'setter' || m.role === 'appointment_setter')
      .map<Candidate>(m => ({ id: (m as any).user_id, name: (m as any).full_name || null, role: 'setter', invited: true }))

    // IDs appearing in activity tables
    const repIds = new Set<string>()
    const repNames = new Map<string, string | null>()
    const setterIds = new Set<string>()
    const setterNames = new Map<string, string | null>()

    const [dialsRes, discoveriesRes, apptsRes] = await Promise.all([
      supabase.from('dials').select('rep_id, setter_id, rep_name, setter_name').eq('account_id', accountId),
      supabase.from('discoveries').select('setter_id, setter_name').eq('account_id', accountId),
      supabase.from('appointments').select('rep_id, setter_id, rep_name, setter_name').eq('account_id', accountId)
    ])

    const add = (id: string | null, name: string | null, type: 'rep' | 'setter') => {
      if (!id) return
      if (type === 'rep') {
        repIds.add(id)
        if (name && !repNames.has(id)) repNames.set(id, name)
      } else {
        setterIds.add(id)
        if (name && !setterNames.has(id)) setterNames.set(id, name)
      }
    }

    ;(dialsRes.data || []).forEach((r: any) => {
      add(r.rep_id, r.rep_name || null, 'rep')
      add(r.setter_id, r.setter_name || null, 'setter')
    })
    ;(discoveriesRes.data || []).forEach((r: any) => add(r.setter_id, r.setter_name || null, 'setter'))
    ;(apptsRes.data || []).forEach((r: any) => {
      add(r.rep_id, r.rep_name || null, 'rep')
      add(r.setter_id, r.setter_name || null, 'setter')
    })

    const invitedRepIds = new Set(invitedReps.map(r => r.id))
    const invitedSetterIds = new Set(invitedSetters.map(s => s.id))

    const uninvitedReps: Candidate[] = Array.from(repIds)
      .filter(id => !invitedRepIds.has(id))
      .map(id => ({ id, name: repNames.get(id) || null, role: 'rep', invited: false }))

    const uninvitedSetters: Candidate[] = Array.from(setterIds)
      .filter(id => !invitedSetterIds.has(id))
      .map(id => ({ id, name: setterNames.get(id) || null, role: 'setter', invited: false }))

    return NextResponse.json({
      reps: [...invitedReps, ...uninvitedReps],
      setters: [...invitedSetters, ...uninvitedSetters]
    })
  } catch (e) {
    console.error('team/candidates error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 