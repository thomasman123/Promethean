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

    // Get all users for this account using a server-side query that bypasses RLS
    // Use explicit foreign key relationship name to avoid ambiguity
    const { data: accountUsers, error } = await supabase
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

    // Transform the data to the expected format
    const users = (accountUsers || []).map((row: any) => {
      const profile = row.profiles
      return {
        id: profile.id,
        name: profile.full_name || 'Unknown',
        email: profile.email || '',
        role: profile.role, // Keep original role from profiles
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