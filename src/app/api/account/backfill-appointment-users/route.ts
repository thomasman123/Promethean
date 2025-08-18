import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n:string)=>request.cookies.get(n)?.value, set(){}, remove(){} } }
    )

    const { accountId, limit = 100 } = await request.json()
    if (!accountId) return NextResponse.json({ error: 'accountId is required' }, { status: 400 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isGlobalAdmin = profile?.role === 'admin'
    if (!isGlobalAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()
      if (!access || !['admin','moderator'].includes(access.role as any)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Find appointments missing setter/sales rep user IDs
    const { data: appts, error: selErr } = await supabase
      .from('appointments')
      .select('id, email, setter, sales_rep')
      .eq('account_id', accountId)
      .is('setter_user_id', null)
      .limit(limit)

    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 400 })

    const filled: Array<{ id: string; setterUserId?: string; salesRepUserId?: string }> = []
    const errors: Array<{ id: string; reason: string }> = []

    for (const a of appts || []) {
      let setterUserId: string | undefined
      let salesRepUserId: string | undefined

      // Try email-based match first
      if (a.email) {
        const { data: p } = await supabase.from('profiles').select('id, email').ilike('email', a.email).maybeSingle()
        if (p?.id) {
          await supabase.rpc('grant_account_access' as any, { p_user_id: p.id, p_account_id: accountId, p_role: 'moderator', p_granted_by_user_id: user.id })
          setterUserId = setterUserId || p.id
          salesRepUserId = salesRepUserId || p.id
        }
      }

      // If still missing, try names (best-effort)
      if (!setterUserId && a.setter) {
        const { data: p } = await supabase.from('profiles').select('id, full_name').ilike('full_name', a.setter).maybeSingle()
        if (p?.id) {
          await supabase.rpc('grant_account_access' as any, { p_user_id: p.id, p_account_id: accountId, p_role: 'moderator', p_granted_by_user_id: user.id })
          setterUserId = p.id
        }
      }
      if (!salesRepUserId && a.sales_rep) {
        const { data: p } = await supabase.from('profiles').select('id, full_name').ilike('full_name', a.sales_rep).maybeSingle()
        if (p?.id) {
          await supabase.rpc('grant_account_access' as any, { p_user_id: p.id, p_account_id: accountId, p_role: 'moderator', p_granted_by_user_id: user.id })
          salesRepUserId = p.id
        }
      }

      if (setterUserId || salesRepUserId) {
        const { error: updErr } = await supabase
          .from('appointments')
          .update({ setter_user_id: setterUserId || null, sales_rep_user_id: salesRepUserId || null })
          .eq('id', a.id)
        if (!updErr) filled.push({ id: a.id, setterUserId, salesRepUserId })
        else errors.push({ id: a.id, reason: updErr.message })
      } else {
        errors.push({ id: a.id, reason: 'No matching user by email/name' })
      }
    }

    return NextResponse.json({ success: true, filled, errors })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 