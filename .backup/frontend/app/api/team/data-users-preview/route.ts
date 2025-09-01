import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

interface DataUserPreview {
  user_id: string
  name: string | null
  email: string
  role: string
  created_for_data: boolean
  data_sources: string[]
  appointment_count: number
  discovery_count: number
  dial_count: number
  ghl_email_found: boolean
  recommended_action: 'invite' | 'verify' | 'ignore'
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

    // Get all data-created users for this account
    const { data: dataUsers } = await supabase
      .from('team_members')
      .select('*')
      .eq('account_id', accountId)
      .eq('created_for_data', true)

    const previews: DataUserPreview[] = []

    for (const dataUser of dataUsers || []) {
      // Count data appearances across tables
      const [appointmentCount, discoveryCount, dialCount] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('account_id', accountId)
          .or(`setter_user_id.eq.${dataUser.user_id},sales_rep_user_id.eq.${dataUser.user_id}`),
        supabase
          .from('discoveries')
          .select('id', { count: 'exact' })
          .eq('account_id', accountId)
          .or(`setter_user_id.eq.${dataUser.user_id},sales_rep_user_id.eq.${dataUser.user_id}`),
        supabase
          .from('dials')
          .select('id', { count: 'exact' })
          .eq('account_id', accountId)
          .eq('setter_user_id', dataUser.user_id || '')
      ])

      const totalActivity = (appointmentCount.count || 0) + (discoveryCount.count || 0) + (dialCount.count || 0)
      const userEmail = dataUser.email || ''
      const ghlEmailFound = !userEmail.includes('+data@promethean.ai')
      
      const dataSources = []
      if (appointmentCount.count) dataSources.push('appointments')
      if (discoveryCount.count) dataSources.push('discoveries')
      if (dialCount.count) dataSources.push('dials')

      let recommendedAction: 'invite' | 'verify' | 'ignore' = 'ignore'
      if (totalActivity >= 5 && ghlEmailFound) {
        recommendedAction = 'invite'
      } else if (totalActivity >= 2) {
        recommendedAction = 'verify'
      }

      previews.push({
        user_id: dataUser.user_id || '',
        name: dataUser.full_name,
        email: userEmail,
        role: dataUser.role || '',
        created_for_data: dataUser.created_for_data || false,
        data_sources: dataSources,
        appointment_count: appointmentCount.count || 0,
        discovery_count: discoveryCount.count || 0,
        dial_count: dialCount.count || 0,
        ghl_email_found: ghlEmailFound,
        recommended_action: recommendedAction
      })
    }

    // Sort by total activity (most active first)
    previews.sort((a, b) => {
      const aTotal = a.appointment_count + a.discovery_count + a.dial_count
      const bTotal = b.appointment_count + b.discovery_count + b.dial_count
      return bTotal - aTotal
    })

    return NextResponse.json({ 
      dataUsers: previews,
      summary: {
        total: previews.length,
        recommended_invites: previews.filter(p => p.recommended_action === 'invite').length,
        needs_verification: previews.filter(p => p.recommended_action === 'verify').length,
        low_activity: previews.filter(p => p.recommended_action === 'ignore').length
      }
    })
  } catch (e) {
    console.error('data-users-preview error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 