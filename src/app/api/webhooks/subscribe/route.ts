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

    if (!locationId) {
      return NextResponse.json({ success: false, error: 'Missing location ID for connection' }, { status: 400 })
    }

    const target = `${appUrl.replace(/\/$/, '')}/api/webhooks`

    console.log('🔔 Manual webhook subscription for account:', accountId)

    const webhookResponse = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        url: target,
        events: ['OutboundMessage', 'AppointmentCreate'],
        name: 'Promethean Manual Webhook',
        version: 'v2'
      })
    })

    const responseText = await webhookResponse.text()
    let webhookData = null
    try {
      webhookData = JSON.parse(responseText)
    } catch {
      // Response wasn't JSON
    }

    const result = {
      success: webhookResponse.ok,
      target,
      status: webhookResponse.status,
      response: webhookData || responseText,
      locationId
    }

    if (webhookResponse.ok) {
      console.log('✅ Manual webhook created successfully:', webhookData?.id)
    } else {
      console.error('❌ Manual webhook creation failed:', {
        status: webhookResponse.status,
        error: responseText
      })
    }

    return NextResponse.json(result, { status: webhookResponse.ok ? 200 : 400 })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Subscribe Webhooks Helper' })
} 