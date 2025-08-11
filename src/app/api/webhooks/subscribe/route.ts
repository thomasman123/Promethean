import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const accountId: string | undefined = body.accountId
    const events: string[] | undefined = Array.isArray(body.events) ? body.events : undefined

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

    const subscribe = async (eventType: string) => {
      const payload: any = { target, eventType }
      if (locationId) payload.locationId = locationId
      const resp = await fetch('https://services.leadconnectorhq.com/webhooks/subscribe/', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      const text = await resp.text().catch(() => '')
      return { eventType, ok: resp.ok, status: resp.status, body: text }
    }

    const eventList = events && events.length > 0 ? events : ['appointment.created', 'message.created']
    const results = await Promise.all(eventList.map(subscribe))

    return NextResponse.json({ success: true, target, results })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Subscribe Webhooks Helper' })
} 