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

    // Create invitation
    const { data: inv, error: invErr } = await supabase.rpc('create_invitation', {
      p_account_id: accountId,
      p_email: email,
      p_full_name: fullName || null,
      p_role: role || 'setter',
    })

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 })

    // Link/backfill immediately so historical rows are attached even before acceptance
    const { error: linkErr } = await supabase.rpc('link_user_to_account_and_backfill', {
      p_account_id: accountId,
      p_email: email,
      p_full_name: fullName || null,
      p_role: role || 'setter',
    })

    if (linkErr) {
      // Non-fatal; return invitation created but linking failed
      return NextResponse.json({ invitation: inv, warning: 'Invitation created but backfill failed' })
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

    return NextResponse.json({ invitation: inv })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 