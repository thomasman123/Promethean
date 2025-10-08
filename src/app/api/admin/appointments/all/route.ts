import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Admin endpoint to fetch ALL appointments across all accounts
 * with optional filtering by rep
 */
export async function GET(request: NextRequest) {
  console.log('🔍 [admin-appointments-all] Starting API call')

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
      console.error('❌ [admin-appointments-all] Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      console.log('❌ [admin-appointments-all] Admin access denied for user:', user.id)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('✅ [admin-appointments-all] Admin access verified')

    const url = new URL(request.url)
    const repUserId = url.searchParams.get('rep_user_id')
    const accountId = url.searchParams.get('account_id')
    const tab = url.searchParams.get('tab') || 'appointments'

    // Use service role to bypass RLS and fetch all data
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

    if (tab === 'appointments') {
      console.log('🔍 [admin-appointments-all] Fetching all appointments...')
      
      let query = serviceSupabase
        .from('appointments')
        .select(`
          id,
          account_id,
          setter,
          sales_rep,
          setter_user_id,
          sales_rep_user_id,
          call_outcome,
          show_outcome,
          cash_collected,
          total_sales_value,
          pitched,
          watched_assets,
          lead_quality,
          objections,
          date_booked_for,
          data_filled,
          follow_up_at,
          accounts!inner (
            id,
            name,
            is_active
          ),
          contacts!inner (
            name,
            email
          )
        `)

      // Apply filters
      if (repUserId && repUserId !== '') {
        console.log('🔍 [admin-appointments-all] Filtering by rep:', repUserId)
        query = query.eq('sales_rep_user_id', repUserId)
      }

      if (accountId && accountId !== '') {
        console.log('🔍 [admin-appointments-all] Filtering by account:', accountId)
        query = query.eq('account_id', accountId)
      }

      query = query.order('date_booked_for', { ascending: false })

      const { data: appointmentsData, error: appointmentsError } = await query

      if (appointmentsError) {
        console.error('❌ [admin-appointments-all] Error fetching appointments:', appointmentsError)
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
      }

      const appointments = (appointmentsData || []).map((appt: any) => ({
        id: appt.id,
        account_id: appt.account_id,
        account_name: appt.accounts?.name || 'Unknown',
        contact_name: appt.contacts?.name || 'Unknown',
        contact_email: appt.contacts?.email || '',
        date_booked_for: appt.date_booked_for,
        setter: appt.setter,
        sales_rep: appt.sales_rep,
        setter_user_id: appt.setter_user_id,
        sales_rep_user_id: appt.sales_rep_user_id,
        call_outcome: appt.call_outcome,
        show_outcome: appt.show_outcome,
        cash_collected: appt.cash_collected,
        total_sales_value: appt.total_sales_value,
        pitched: appt.pitched,
        watched_assets: appt.watched_assets,
        lead_quality: appt.lead_quality,
        objections: appt.objections,
        data_filled: appt.data_filled,
        follow_up_at: appt.follow_up_at
      }))

      console.log(`✅ [admin-appointments-all] Found ${appointments.length} appointments`)
      return NextResponse.json({ appointments })

    } else if (tab === 'discoveries') {
      console.log('🔍 [admin-appointments-all] Fetching all discoveries...')
      
      let query = serviceSupabase
        .from('discoveries')
        .select(`
          id,
          account_id,
          setter,
          sales_rep,
          setter_user_id,
          sales_rep_user_id,
          call_outcome,
          show_outcome,
          lead_quality,
          date_booked_for,
          data_filled,
          accounts!inner (
            id,
            name,
            is_active
          ),
          contacts!inner (
            name,
            email
          )
        `)

      // Apply filters (for discoveries, filter by setter_user_id)
      if (repUserId && repUserId !== '') {
        console.log('🔍 [admin-appointments-all] Filtering discoveries by setter:', repUserId)
        query = query.eq('setter_user_id', repUserId)
      }

      if (accountId && accountId !== '') {
        console.log('🔍 [admin-appointments-all] Filtering by account:', accountId)
        query = query.eq('account_id', accountId)
      }

      query = query.order('date_booked_for', { ascending: false })

      const { data: discoveriesData, error: discoveriesError } = await query

      if (discoveriesError) {
        console.error('❌ [admin-appointments-all] Error fetching discoveries:', discoveriesError)
        return NextResponse.json({ error: 'Failed to fetch discoveries' }, { status: 500 })
      }

      const discoveries = (discoveriesData || []).map((disc: any) => ({
        id: disc.id,
        account_id: disc.account_id,
        account_name: disc.accounts?.name || 'Unknown',
        contact_name: disc.contacts?.name || 'Unknown',
        contact_email: disc.contacts?.email || '',
        date_booked_for: disc.date_booked_for,
        setter: disc.setter,
        sales_rep: disc.sales_rep,
        setter_user_id: disc.setter_user_id,
        sales_rep_user_id: disc.sales_rep_user_id,
        call_outcome: disc.call_outcome,
        show_outcome: disc.show_outcome,
        lead_quality: disc.lead_quality,
        data_filled: disc.data_filled
      }))

      console.log(`✅ [admin-appointments-all] Found ${discoveries.length} discoveries`)
      return NextResponse.json({ discoveries })
    }

    return NextResponse.json({ error: 'Invalid tab parameter' }, { status: 400 })

  } catch (error: any) {
    console.error('❌ [admin-appointments-all] Unexpected error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

