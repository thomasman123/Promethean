import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
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
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('API: Authenticated user:', user.id, user.email)

    const body = await request.json()
    const { accountId, name, description, tableType, scope = 'private' } = body

    console.log('API: Request data:', { accountId, name, description, tableType, scope, userId: user.id })

    // Validate required fields
    if (!accountId || !name?.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields: accountId, name' },
        { status: 400 }
      )
    }

    // Validate scope
    if (!['private', 'team', 'global'].includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be private, team, or global' },
        { status: 400 }
      )
    }

    // Check if user is global admin first
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profileData?.role === 'admin'
    console.log('API: Is global admin?', isGlobalAdmin)

    if (!isGlobalAdmin) {
      // Non-global admins need explicit account access
      console.log('API: Checking account access for non-global admin')
      
      const { data: userAccess, error: accessError } = await supabase
        .from('account_access')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .single()

      console.log('API: Access check result:', userAccess, accessError)

      if (accessError || !userAccess) {
        console.error('Access check failed:', {
          userId: user.id,
          userEmail: user.email,
          accountId,
          error: accessError,
          userAccess
        })
        return NextResponse.json({ 
          error: 'Access denied to this account',
          debug: {
            userId: user.id,
            userEmail: user.email,
            accountId,
            accessError: accessError?.message
          }
        }, { status: 403 })
      }

      if (!userAccess.is_active) {
        return NextResponse.json({ error: 'Account access is not active' }, { status: 403 })
      }

      // Non-admins can only create private tables or need admin role for team tables
      if (scope === 'team' && userAccess.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Only account admins can create team tables' 
        }, { status: 403 })
      }

      // Only global admins can create global tables
      if (scope === 'global') {
        return NextResponse.json({ 
          error: 'Only global admins can create global tables' 
        }, { status: 403 })
      }
    } else {
      // Global admins can access any active account
      console.log('API: Global admin - checking account is active')
      
      const { data: accountCheck } = await supabase
        .from('accounts')
        .select('is_active')
        .eq('id', accountId)
        .single()

      if (!accountCheck?.is_active) {
        return NextResponse.json({ error: 'Account is not active' }, { status: 403 })
      }
      
      console.log('API: Global admin access granted to account', accountId)
    }

    // Create the table
    const { data, error } = await supabase
      .from('data_tables')
      .insert({
        account_id: accountId,
        name: name.trim(),
        description: description?.trim() || null,
        table_type: tableType || 'user_metrics',
        scope: scope,
        columns: [
          // Base columns (name, email, role) are now handled by baseColumns in the frontend
          // Only store metric/custom columns in the table configuration
        ],
        filters: { roles: [] },
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Database error creating table:', error)
      return NextResponse.json(
        { error: `Failed to create table: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ table: data })

  } catch (error) {
    console.error('Error in tables API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Check if user is global admin first
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalAdmin = profileData?.role === 'admin'

    if (!isGlobalAdmin) {
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

    // Build query to get visible tables based on scope and user permissions
    let query = supabase
      .from('data_tables')
      .select('*')
      .eq('account_id', accountId)

    if (isGlobalAdmin) {
      // Global admins can see all tables (private, team, global)
      // No additional filtering needed
    } else {
      // Non-global users can see:
      // 1. Their own private tables
      // 2. Team tables for this account
      // 3. Global tables (if any)
      query = query.or(`and(scope.eq.private,created_by.eq.${user.id}),scope.eq.team,scope.eq.global`)
    }

    const { data: tables, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database error loading tables:', error)
      return NextResponse.json(
        { error: `Failed to load tables: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ tables })

  } catch (error) {
    console.error('Error in tables API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 