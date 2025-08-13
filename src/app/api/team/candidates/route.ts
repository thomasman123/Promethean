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

    // Split into reps and setters based on their role (exclude moderators - they're for account management only)
    const invitedReps = (team || [])
      .filter(m => m.role && ['sales_rep', 'admin'].includes(m.role)) // Removed 'moderator'
      .filter(m => (m as any).full_name && (m as any).full_name.trim().length > 2) // Filter out invalid names
      .map<Candidate>(m => ({ 
        id: (m as any).user_id, 
        name: (m as any).full_name?.trim() || (m as any).email || 'Unknown', 
        role: 'rep', 
        invited: true 
      }))

    const invitedSetters = (team || [])
      .filter(m => m.role && ['setter', 'admin'].includes(m.role)) // Removed 'moderator'
      .filter(m => (m as any).full_name && (m as any).full_name.trim().length > 2) // Filter out invalid names
      .map<Candidate>(m => ({ 
        id: (m as any).user_id, 
        name: (m as any).full_name?.trim() || (m as any).email || 'Unknown', 
        role: 'setter', 
        invited: true 
      }))

    return NextResponse.json({
      reps: invitedReps,
      setters: invitedSetters
    })
  } catch (e) {
    console.error('team/candidates error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 