import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const aggregate = searchParams.get('aggregate') === '1'
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    // Verify user authentication and permissions
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check global role
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

    // Get account record to detect agency
    const { data: account } = await supabase
      .from('accounts')
      .select('id, is_active, is_agency')
      .eq('id', accountId)
      .single()

    // Determine which account IDs to include
    let accountIds: string[] = [accountId]
    if (aggregate && account?.is_agency) {
      if (isGlobalAdmin) {
        // All active non-agency accounts
        const { data: all } = await supabase
          .from('accounts')
          .select('id')
          .eq('is_active', true)
          .neq('is_agency', true)
        accountIds = (all || []).map(a => a.id)
      } else {
        // Accounts this user can access
        const { data: acc } = await supabase
          .from('account_access')
          .select('account_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
        accountIds = (acc || []).map(a => a.account_id)
      }
    }

    if (accountIds.length === 0) {
      return NextResponse.json({ pendingUsers: [], count: 0 })
    }

    // Query pending GHL users for the target accounts
    let { data: ghlUsers, error: ghlError } = await supabase
      .from('ghl_users' as any)
      .select('*')
      .in('account_id', accountIds)
      .eq('is_invited', false)
      .gt('activity_count', 0)

    if (ghlError) {
      console.error('Error fetching GHL users:', ghlError)
      return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 })
    }

    // If empty, try to backfill/sync from existing data then re-query
    if (!ghlUsers || ghlUsers.length === 0) {
      try {
        for (const id of accountIds) {
          // Best-effort sync; ignore errors
          await supabase.rpc('sync_ghl_users_from_existing_data' as any, { p_account_id: id })
        }
        const requery = await supabase
          .from('ghl_users' as any)
          .select('*')
          .in('account_id', accountIds)
          .eq('is_invited', false)
          .gt('activity_count', 0)
        if (!requery.error) ghlUsers = requery.data || []
      } catch (e) {
        console.warn('GHL users sync fallback failed:', e)
      }
    }

    // If still empty for a single account, compute a DB-only fallback from activity
    if ((!ghlUsers || ghlUsers.length === 0) && accountIds.length === 1) {
      const targetId = accountIds[0]
      const pendingUsers: any[] = []

      // Gather distinct GHL user IDs and rough names from activity tables
      const [{ data: appointments }, { data: discoveries }, { data: dials }] = await Promise.all([
        supabase
          .from('appointments' as any)
          .select('setter_ghl_id, sales_rep_ghl_id, setter, sales_rep')
          .eq('account_id', targetId),
        supabase
          .from('discoveries' as any)
          .select('setter_ghl_id, sales_rep_ghl_id, setter, sales_rep')
          .eq('account_id', targetId),
        supabase
          .from('dials' as any)
          .select('setter_ghl_id, sales_rep_ghl_id, setter_name')
          .eq('account_id', targetId),
      ])

      const ids = new Map<string, { name?: string, setterCount: number, repCount: number, total: number }>()

      const addId = (ghlId?: string | null, name?: string | null, isRep?: boolean) => {
        if (!ghlId) return
        const cur = ids.get(ghlId) || { name: undefined, setterCount: 0, repCount: 0, total: 0 }
        if (name && !cur.name) cur.name = name
        if (isRep) cur.repCount += 1
        else cur.setterCount += 1
        cur.total += 1
        ids.set(ghlId, cur)
      }

      appointments?.forEach((a: any) => {
        addId(a.setter_ghl_id, a.setter, false)
        addId(a.sales_rep_ghl_id, a.sales_rep, true)
      })
      discoveries?.forEach((d: any) => {
        addId(d.setter_ghl_id, d.setter, false)
        addId(d.sales_rep_ghl_id, d.sales_rep, true)
      })
      dials?.forEach((d: any) => {
        addId(d.setter_ghl_id, d.setter_name, false)
        addId(d.sales_rep_ghl_id, undefined, true)
      })

      ids.forEach((counts, ghl_user_id) => {
        if (counts.total > 0) {
          const suggested = counts.repCount > counts.setterCount ? 'sales_rep' : 'setter'
          pendingUsers.push({
            ghl_user_id,
            name: counts.name || 'Unknown',
            email: null,
            primary_role: suggested,
            roles: [suggested],
            activity_count: counts.total,
            setter_activity_count: counts.setterCount,
            sales_rep_activity_count: counts.repCount,
            last_seen_at: null,
            account_id: targetId,
          })
        }
      })

      console.log(`pending-ghl-users fallback computed ${pendingUsers.length} users for account ${targetId}`)
      // Sort by activity desc
      pendingUsers.sort((a, b) => (b.activity_count || 0) - (a.activity_count || 0))
      return NextResponse.json({ pendingUsers, count: pendingUsers.length, fallback: true })
    }

    const pendingUsers = (ghlUsers || []).map((user: any) => ({
      ghl_user_id: user.ghl_user_id,
      name: user.name,
      email: user.email,
      primary_role: user.primary_role,
      roles: user.roles || [],
      activity_count: user.activity_count,
      setter_activity_count: user.setter_activity_count || 0,
      sales_rep_activity_count: user.sales_rep_activity_count || 0,
      last_seen_at: user.last_seen_at,
      account_id: user.account_id,
    }))

    console.log(`pending-ghl-users returning ${pendingUsers.length} users for ${accountIds.length} account(s)`) 
    return NextResponse.json({ pendingUsers, count: pendingUsers.length })
  } catch (e) {
    console.error('pending-ghl-users error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 