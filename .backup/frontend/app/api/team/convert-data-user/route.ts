import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
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

    const { accountId, userId, realEmail, fullName } = await request.json()
    
    if (!accountId || !userId || !realEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has permission to manage this account
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

      if (!access || !['moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Convert the data user to invited status
    const { error: convertError } = await supabase.rpc(
      'convert_data_user_to_invited',
      { p_user_id: userId, p_real_email: realEmail }
    )

    if (convertError) {
      return NextResponse.json({ error: convertError.message }, { status: 400 })
    }

    // Create an invitation for the user
    const { error: inviteError } = await supabase.rpc(
      'create_invitation',
      { 
        p_account_id: accountId,
        p_email: realEmail,
        p_full_name: fullName,
        p_role: 'setter' // Default role, can be updated later
      }
    )

    if (inviteError) {
      console.warn('Failed to create invitation:', inviteError.message)
      // Don't fail the whole operation if invitation creation fails
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('convert-data-user error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 