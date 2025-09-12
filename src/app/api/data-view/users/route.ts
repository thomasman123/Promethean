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

    if (isGlobalAdmin) {
      // Global admins can use the RPC function that bypasses RLS
      const { data: teamMembers, error } = await queryClient
        .rpc('get_account_team_members', { p_account_id: accountId })

      if (error) {
        console.error('Error loading team members via RPC:', error)
        return NextResponse.json(
          { error: `Failed to load users: ${error.message}` },
          { status: 500 }
        )
      }

      console.log('Team members from RPC:', teamMembers)
      
      const users = (teamMembers || []).map((member: any) => ({
        id: member.user_id,
        name: member.full_name || 'Unknown',
        email: member.email || '',
        role: member.display_role, // Already calculated (setter/rep) - always synced with account_role
        accountRole: member.account_role, // Actual account role for filtering (sales_rep, moderator, admin, setter)
        setterActivityCount: member.setter_activity_count,
        salesRepActivityCount: member.sales_rep_activity_count,
        totalActivityCount: member.total_activity_count,
        isActive: member.is_active,
        createdForData: member.created_for_data
      }))

      console.log('Transformed users from RPC:', users)
      return NextResponse.json({ users })
    } else {
      // Regular users use the view with RLS
      const { data: teamMembers, error } = await queryClient
        .from('team_members')
        .select('*')
        .eq('account_id', accountId)

      if (error) {
        console.error('Error loading team members from view:', error)
        return NextResponse.json(
          { error: `Failed to load users: ${error.message}` },
          { status: 500 }
        )
      }

      console.log('Team members from view:', teamMembers)

      const users = (teamMembers || []).map((member: any) => ({
        id: member.user_id,
        name: member.full_name || 'Unknown',
        email: member.email || '',
        role: member.display_role || (member.role === 'sales_rep' || member.role === 'moderator' || member.role === 'admin' ? 'rep' : 'setter'),
        accountRole: member.role, // Actual account role for filtering (sales_rep, moderator, admin, setter)
        isActive: member.is_active,
        createdForData: member.created_for_data
      }))

             console.log('Transformed users from view:', users)
       return NextResponse.json({ users })
     }

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 