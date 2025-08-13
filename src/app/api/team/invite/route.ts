import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

    // Create admin client for sending invitations
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const body = await request.json()
    const { accountId, email, fullName, role } = body || {}
    if (!accountId || !email) {
      return NextResponse.json({ error: 'accountId and email are required' }, { status: 400 })
    }

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
      // Check for account-level access
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()

      if (!access || !['admin', 'moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser.users.find(u => u.email === email)
    
    if (userExists) {
      // User already has an auth account, just create local invitation record and link them
      const { data: inv, error: invErr } = await supabase.rpc('create_invitation', {
        p_account_id: accountId,
        p_email: email,
        p_full_name: fullName || null,
        p_role: role || 'setter',
      })

      if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

      // Link them immediately since they can log in
      const { error: linkErr } = await supabase.rpc('link_user_to_account_and_backfill', {
        p_account_id: accountId,
        p_email: email,
        p_full_name: fullName || null,
        p_role: role || 'setter',
      })

      if (linkErr) {
        console.warn('Failed to link existing user:', linkErr)
      }

      return NextResponse.json({ 
        invitation: inv, 
        message: 'User already exists - they have been added to the account and can log in normally'
      })
    }

    // Send email invitation through Supabase Auth
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const cleanUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl
    
    const { data: invitedUser, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${cleanUrl}/api/auth/supabase-callback?next=/dashboard`,
      data: {
        full_name: fullName || '',
        account_id: accountId,
        role: role || 'setter'
      }
    })

    if (inviteErr) {
      console.error('Supabase invite error:', inviteErr)
      return NextResponse.json({ error: `Failed to send invitation: ${inviteErr.message}` }, { status: 400 })
    }

    // Create invitation record in our database for tracking
    const { data: inv, error: invErr } = await supabase.rpc('create_invitation', {
      p_account_id: accountId,
      p_email: email,
      p_full_name: fullName || null,
      p_role: role || 'setter',
    })

    if (invErr) {
      console.error('Database invitation error:', invErr)
      // Email was sent but we couldn't track it - continue anyway
    }

    // Pre-link and backfill so historical data is ready when they accept
    const { error: linkErr } = await supabase.rpc('link_user_to_account_and_backfill', {
      p_account_id: accountId,
      p_email: email,
      p_full_name: fullName || null,
      p_role: role || 'setter',
    })

    if (linkErr) {
      console.warn('Failed to pre-link user data:', linkErr)
    }

    // After invitation is created, check if this email matches any GHL users and backfill their data
    try {
      // Find GHL users with matching email
      const { data: ghlUsers } = await supabase
        .from('ghl_users' as any)
        .select('ghl_user_id')
        .eq('account_id', accountId)
        .eq('email', email)
        .eq('is_invited', false)

      if (ghlUsers && ghlUsers.length > 0) {
        // Get the app user ID from the invitation
        const { data: createdUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (createdUser) {
          // Backfill data for each matching GHL user
          for (const ghlUser of ghlUsers as any[]) {
            const { data: backfillResult } = await supabase.rpc(
              'backfill_user_data_on_invitation' as any,
              {
                p_account_id: accountId,
                p_ghl_user_id: (ghlUser as any).ghl_user_id,
                p_app_user_id: createdUser.id
              }
            )
            
            if (backfillResult && backfillResult.length > 0) {
              console.log(`✅ Backfilled GHL user ${(ghlUser as any).ghl_user_id}:`, backfillResult[0])
            }
          }
        }
      }
    } catch (ghlBackfillError) {
      console.warn('Failed to backfill GHL user data (non-critical):', ghlBackfillError)
      // Don't fail the invitation for this
    }

    return NextResponse.json({ 
      invitation: { ...inv, auth_user_id: invitedUser?.user?.id },
      message: 'Invitation email sent successfully'
    })
  } catch (e) {
    console.error('Invite API error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 