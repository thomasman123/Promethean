import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const accountId: string | undefined = body.accountId

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'accountId is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ success: false, error: 'Server not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: connection, error } = await supabase
      .from('ghl_connections')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_connected', true)
      .single()

    if (error || !connection) {
      return NextResponse.json({ success: false, error: 'No active GHL connection for this account' }, { status: 404 })
    }

    const locationId: string | undefined = connection.ghl_location_id || undefined
    const accessToken: string | undefined = connection.access_token || undefined
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Missing access token for connection' }, { status: 400 })
    }

    const target = `${appUrl.replace(/\/$/, '')}/api/webhooks`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
    }
    if (locationId) headers['Location'] = locationId

    const events = ['OutboundMessage', 'AppointmentCreate']

    const attempts: Array<{ name: string; url: string; body: any }> = []
    if (locationId) {
      attempts.push({
        name: 'Locations-scoped webhooks',
        url: `https://services.leadconnectorhq.com/locations/${encodeURIComponent(locationId)}/webhooks`,
        body: { url: target, events },
      })
    }
    attempts.push(
      {
        name: 'V2 webhooks',
        url: 'https://services.leadconnectorhq.com/v2/webhooks',
        body: locationId ? { locationId, url: target, events } : { url: target, events },
      },
      {
        name: 'Legacy webhooks',
        url: 'https://services.leadconnectorhq.com/webhooks',
        body: locationId ? { locationId, url: target, events } : { url: target, events },
      }
    )

    const results: Array<{ attempt: string; ok: boolean; status: number; body: string }> = []
    let success = false
    for (const attempt of attempts) {
      const resp = await fetch(attempt.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(attempt.body),
      })
      const text = await resp.text().catch(() => '')
      results.push({ attempt: attempt.name, ok: resp.ok, status: resp.status, body: text })
      if (resp.ok) {
        success = true
        break
      }
    }

    return NextResponse.json({ success, target, results })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Subscribe Webhooks Helper' })
} 