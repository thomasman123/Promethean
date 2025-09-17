import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 [ordered-flow-api] Starting API call')
  
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  const accountId = searchParams.get('account_id') || ''
  
  console.log('🔍 [ordered-flow-api] Query params:', {
    userId,
    accountId
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
    console.log('🔍 [ordered-flow-api] Getting authenticated user...')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ [ordered-flow-api] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Determine effective user (considering impersonation)
    const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value
    let effectiveUserId = user.id
    let isImpersonating = false
    
    console.log('🔍 [ordered-flow-api] Checking for impersonation...')
    console.log('🔍 [ordered-flow-api] impersonate_user_id cookie:', impersonatedUserId)
    
    if (impersonatedUserId) {
      console.log('🔍 [ordered-flow-api] Impersonation detected, verifying admin status...')
      // Verify the current user is an admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('🔍 [ordered-flow-api] Admin profile check:', adminProfile)

      if (adminProfile?.role === 'admin') {
        effectiveUserId = impersonatedUserId
        isImpersonating = true
        console.log('✅ [ordered-flow-api] Impersonation authorized, effective user:', effectiveUserId)
      } else {
        console.log('❌ [ordered-flow-api] Impersonation denied - user is not admin')
      }
    }

    // Validate that the requested userId matches the effective user
    if (userId !== effectiveUserId) {
      console.log('❌ [ordered-flow-api] Requested user ID does not match effective user')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('🔍 [ordered-flow-api] Final effective user ID:', effectiveUserId)
    console.log('🔍 [ordered-flow-api] Is impersonating:', isImpersonating)

    // Determine which Supabase client to use based on impersonation
    let querySupabase = supabase
    if (isImpersonating) {
      console.log('🔍 [ordered-flow-api] Using service role for impersonated query...')
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

    // Get current time to filter for past appointments/discoveries only
    const now = new Date().toISOString()
    console.log('🔍 [ordered-flow-api] Filtering for items before:', now)

    // Fetch appointments where user is sales rep and date_booked_for has passed
    console.log('🔍 [ordered-flow-api] Fetching past appointments where user is sales rep...')
    
    let appointmentsQuery = querySupabase
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
      .eq('sales_rep_user_id', effectiveUserId)
      .lte('date_booked_for', now)

    // Apply account filter if specified
    if (accountId && accountId !== '') {
      appointmentsQuery = appointmentsQuery.eq('account_id', accountId)
    }

    const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      console.error('❌ [ordered-flow-api] Error fetching appointments:', appointmentsError)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    // Fetch discoveries where user is setter and date_booked_for has passed
    console.log('🔍 [ordered-flow-api] Fetching past discoveries where user is setter...')
    
    let discoveriesQuery = querySupabase
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
      .lte('date_booked_for', now)

    // Apply account filter if specified
    if (accountId && accountId !== '') {
      discoveriesQuery = discoveriesQuery.eq('account_id', accountId)
    }

    const { data: discoveriesData, error: discoveriesError } = await discoveriesQuery

    if (discoveriesError) {
      console.error('❌ [ordered-flow-api] Error fetching discoveries:', discoveriesError)
      return NextResponse.json({ error: 'Failed to fetch discoveries' }, { status: 500 })
    }

    // Map appointments data
    const appointments = (appointmentsData || []).map((apt: any) => ({
      id: apt.id,
      type: 'appointment' as const,
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
      data_filled: apt.data_filled || false,
      follow_up_at: apt.follow_up_at
    }))

    // Map discoveries data
    const discoveries = (discoveriesData || []).map((disc: any) => ({
      id: disc.id,
      type: 'discovery' as const,
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

    // Combine and sort by date_booked_for (most recent first, then oldest first as requested)
    const allItems = [...appointments, ...discoveries].sort((a, b) => {
      return new Date(a.date_booked_for).getTime() - new Date(b.date_booked_for).getTime()
    })

    console.log('✅ [ordered-flow-api] Returning', allItems.length, 'combined items')
    console.log('✅ [ordered-flow-api] Appointments:', appointments.length, 'Discoveries:', discoveries.length)
    
    return NextResponse.json({ 
      items: allItems,
      appointments: appointments.length,
      discoveries: discoveries.length,
      total: allItems.length
    })

  } catch (error) {
    console.error('❌ [ordered-flow-api] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 