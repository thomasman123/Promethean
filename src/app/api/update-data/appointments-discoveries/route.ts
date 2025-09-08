import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 [appointments-discoveries-api] Starting API call')
  
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const accountId = searchParams.get('account_id') || ''
  const tab = searchParams.get('tab') || 'appointments'
  
  console.log('🔍 [appointments-discoveries-api] Query params:', {
    userId,
    accountId,
    tab
  })

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  try {
    console.log('🔍 [appointments-discoveries-api] Getting authenticated user...')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ [appointments-discoveries-api] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine effective user (considering impersonation)
    const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value
    let effectiveUserId = user.id
    let isImpersonating = false
    
    console.log('🔍 [appointments-discoveries-api] Checking for impersonation...')
    console.log('🔍 [appointments-discoveries-api] impersonate_user_id cookie:', impersonatedUserId)
    
    if (impersonatedUserId) {
      console.log('🔍 [appointments-discoveries-api] Impersonation detected, verifying admin status...')
      // Verify the current user is an admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('🔍 [appointments-discoveries-api] Admin profile check:', adminProfile)

      if (adminProfile?.role === 'admin') {
        effectiveUserId = impersonatedUserId
        isImpersonating = true
        console.log('✅ [appointments-discoveries-api] Impersonation authorized, effective user:', effectiveUserId)
      } else {
        console.log('❌ [appointments-discoveries-api] Impersonation denied - user is not admin')
      }
    }

    // Validate that the requested userId matches the effective user
    if (userId !== effectiveUserId) {
      console.log('❌ [appointments-discoveries-api] Requested user ID does not match effective user')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('🔍 [appointments-discoveries-api] Final effective user ID:', effectiveUserId)
    console.log('🔍 [appointments-discoveries-api] Is impersonating:', isImpersonating)

    // Determine which Supabase client to use based on impersonation
    let querySupabase = supabase
    if (isImpersonating) {
      console.log('🔍 [appointments-discoveries-api] Using service role for impersonated query...')
      querySupabase = createServerClient(
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
    }

    if (tab === 'appointments') {
      console.log('🔍 [appointments-discoveries-api] Fetching appointments where user is sales rep...')
      
      let query = querySupabase
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
        .eq('sales_rep_user_id', effectiveUserId)

      // Apply account filter if specified
      if (accountId && accountId !== '') {
        query = query.eq('account_id', accountId)
      }

      query = query.order('date_booked_for', { ascending: false })

      const { data: appointmentsData, error: appointmentsError } = await query

      if (appointmentsError) {
        console.error('❌ [appointments-discoveries-api] Error fetching appointments:', appointmentsError)
        return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
      }

      const appointments = (appointmentsData || []).map((apt: any) => ({
        id: apt.id,
        account_id: apt.account_id,
        account_name: apt.accounts?.name || 'Unknown Account',
        contact_name: apt.contacts?.name || 'Unknown Contact',
        contact_email: apt.contacts?.email || '',
        date_booked_for: apt.date_booked_for,
        setter: apt.setter,
        sales_rep: apt.sales_rep,
        setter_user_id: apt.setter_user_id,
        sales_rep_user_id: apt.sales_rep_user_id,
        call_outcome: apt.call_outcome,
        show_outcome: apt.show_outcome,
        cash_collected: apt.cash_collected,
        total_sales_value: apt.total_sales_value,
        pitched: apt.pitched,
        watched_assets: apt.watched_assets,
        lead_quality: apt.lead_quality,
        objections: apt.objections,
        data_filled: apt.data_filled || false
      }))

      console.log('✅ [appointments-discoveries-api] Returning', appointments.length, 'appointments')
      return NextResponse.json({ appointments })

    } else {
      console.log('🔍 [appointments-discoveries-api] Fetching discoveries where user is setter...')
      
      let query = querySupabase
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
        .eq('setter_user_id', effectiveUserId)

      // Apply account filter if specified
      if (accountId && accountId !== '') {
        query = query.eq('account_id', accountId)
      }

      query = query.order('date_booked_for', { ascending: false })

      const { data: discoveriesData, error: discoveriesError } = await query

      if (discoveriesError) {
        console.error('❌ [appointments-discoveries-api] Error fetching discoveries:', discoveriesError)
        return NextResponse.json({ error: 'Failed to fetch discoveries' }, { status: 500 })
      }

      const discoveries = (discoveriesData || []).map((disc: any) => ({
        id: disc.id,
        account_id: disc.account_id,
        account_name: disc.accounts?.name || 'Unknown Account',
        contact_name: disc.contacts?.name || 'Unknown Contact',
        contact_email: disc.contacts?.email || '',
        date_booked_for: disc.date_booked_for,
        setter: disc.setter,
        sales_rep: disc.sales_rep,
        setter_user_id: disc.setter_user_id,
        sales_rep_user_id: disc.sales_rep_user_id,
        call_outcome: disc.call_outcome,
        show_outcome: disc.show_outcome,
        lead_quality: disc.lead_quality,
        data_filled: disc.data_filled || false
      }))

      console.log('✅ [appointments-discoveries-api] Returning', discoveries.length, 'discoveries')
      return NextResponse.json({ discoveries })
    }

  } catch (error) {
    console.error('❌ [appointments-discoveries-api] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 