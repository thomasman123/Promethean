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

    // Use the existing team_members view which is the single source of truth
    const { data: teamMembers, error } = await queryClient
      .from('team_members')
      .select('*')
      .eq('account_id', accountId)

    if (error) {
      console.error('Error loading team members:', error)
      return NextResponse.json(
        { error: `Failed to load users: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('Raw team members data:', teamMembers)

    // Transform the data to the expected format with proper role mapping
    const users = (teamMembers || []).map((member: any) => {
      // Map account roles to display roles
      let displayRole = 'setter' // default
      
      if (member.role === 'sales_rep' || member.role === 'moderator' || member.role === 'admin') {
        displayRole = 'rep'
      }
      
      return {
        id: member.user_id,
        name: member.full_name || 'Unknown',
        email: member.email || '',
        role: displayRole, // Simplified role for UI (setter/rep)
        accountRole: member.role, // Original account access role
        isActive: member.is_active,
        createdForData: member.created_for_data
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