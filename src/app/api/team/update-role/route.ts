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

    const { accountId, userId, role } = await request.json()
    if (!accountId || !userId || !role) {
      return NextResponse.json({ error: 'accountId, userId and role are required' }, { status: 400 })
    }

    const { error } = await supabase.rpc('grant_account_access', {
      p_user_id: userId,
      p_account_id: accountId,
      p_role: role,
      p_granted_by_user_id: null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 