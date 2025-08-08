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

    return NextResponse.json({ invitation: inv })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 