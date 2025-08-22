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
    const { accountId } = body || {}
    if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

    // Authn
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only global admins can disconnect GHL' }, { status: 403 })
    }

    // Fetch account to get current webhook and token
    const { data: account } = await supabase
      .from('accounts')
      .select('id, ghl_api_key, ghl_webhook_id, ghl_location_id')
      .eq('id', accountId)
      .single()

    // Best-effort webhook unsubscribe
    if (account?.ghl_api_key && account?.ghl_webhook_id) {
      try {
        const resp = await fetch(`https://services.leadconnectorhq.com/webhooks/${account.ghl_webhook_id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${account.ghl_api_key}`,
            Version: '2021-07-28',
            Accept: 'application/json'
          }
        })
        if (!resp.ok) {
          const txt = await resp.text().catch(()=> '')
          console.warn('Failed to delete webhook:', resp.status, txt)
        }
      } catch (e) {
        console.warn('Exception deleting webhook:', e)
      }
    }

    // Clear OAuth fields
    const { error: updErr } = await supabase
      .from('accounts')
      .update({
        ghl_api_key: null,
        ghl_refresh_token: null,
        ghl_location_id: null,
        ghl_auth_type: null,
        ghl_token_expires_at: null,
        ghl_webhook_id: null,
        future_sync_enabled: false,
      })
      .eq('id', accountId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 