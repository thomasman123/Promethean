import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId parameter' },
        { status: 400 }
      )
    }

    console.log('Loading users for account:', accountId, 'by user:', user.id)

    // Check if user is global admin first
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profileData?.role === 'admin'
    console.log('Is global admin?', isGlobalAdmin)

    let queryClient = supabase

    if (isGlobalAdmin) {
      // For global admins, use service role to bypass RLS
      queryClient = createServerClient(
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
      console.log('Using service role for global admin query')
    } else {
      // Check user access to account for non-global admins
      const { data: userAccess, error: accessError } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .single()

      if (accessError || !userAccess) {
        return NextResponse.json({ error: 'Access denied to this account' }, { status: 403 })
      }
    }

    // Get all users for this account using appropriate client
    const { data: accountUsers, error } = await queryClient
      .from('account_access')
      .select(`
        user_id,
        role,
        is_active,
        profiles!account_access_user_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .eq('account_id', accountId)
      .eq('is_active', true)

    if (error) {
      console.error('Error loading account users:', error)
      return NextResponse.json(
        { error: `Failed to load users: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('Raw account users data:', accountUsers)

    // Get functional roles based on actual data activity
    const userIds = (accountUsers || []).map((row: any) => row.profiles.id)
    
    let functionalRoles: any = {}
    if (userIds.length > 0) {
      // Query appointments and dials to determine functional roles
      const { data: activityData } = await queryClient.rpc('execute_metrics_query_array', {
        query_sql: `
          SELECT 
            p.id,
            COUNT(CASE WHEN a.setter_user_id = p.id THEN 1 END) as appointments_as_setter,
            COUNT(CASE WHEN a.sales_rep_user_id = p.id THEN 1 END) as appointments_as_sales_rep,
            COUNT(CASE WHEN d.setter_user_id = p.id THEN 1 END) as dials_as_setter,
            CASE 
              WHEN COUNT(CASE WHEN a.sales_rep_user_id = p.id THEN 1 END) > 0 THEN 'rep'
              WHEN COUNT(CASE WHEN a.setter_user_id = p.id THEN 1 END) > 0 OR COUNT(CASE WHEN d.setter_user_id = p.id THEN 1 END) > 0 THEN 'setter'
              ELSE 'inactive'
            END as functional_role
          FROM profiles p
          LEFT JOIN appointments a ON (a.setter_user_id = p.id OR a.sales_rep_user_id = p.id) AND a.account_id = $1
          LEFT JOIN dials d ON d.setter_user_id = p.id AND d.account_id = $1
          WHERE p.id = ANY($2)
          GROUP BY p.id
        `,
        query_params: { 1: accountId, 2: userIds }
      })

      // Convert to lookup object
      if (Array.isArray(activityData)) {
        activityData.forEach((row: any) => {
          functionalRoles[row.id] = row.functional_role
        })
      } else if (activityData) {
        // Handle single result
        const parsed = JSON.parse(String(activityData))
        if (Array.isArray(parsed)) {
          parsed.forEach((row: any) => {
            functionalRoles[row.id] = row.functional_role
          })
        }
      }
    }

    console.log('Functional roles:', functionalRoles)

    // Transform the data to the expected format
    const users = (accountUsers || []).map((row: any) => {
      const profile = row.profiles
      const functionalRole = functionalRoles[profile.id] || 'inactive'
      
      return {
        id: profile.id,
        name: profile.full_name || 'Unknown',
        email: profile.email || '',
        role: functionalRole, // Use functional role based on data activity
        profileRole: profile.role, // Original role from profiles
        accountRole: row.role, // Role within this account
        isActive: row.is_active
      }
    })

    console.log('Transformed users:', users)

    return NextResponse.json({ users })

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 