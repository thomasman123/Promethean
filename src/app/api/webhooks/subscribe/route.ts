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
    
    // Get account with GHL data (migrated from old ghl_connections table)
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('ghl_auth_type', 'oauth2')
      .single()

    if (accountError || !account) {
      return NextResponse.json({ success: false, error: 'No active OAuth account found' }, { status: 404 })
    }

    const locationId: string | undefined = account.ghl_location_id || undefined
    const accessToken: string | undefined = account.ghl_api_key || undefined

    const target = `${appUrl.replace(/\/$/, '')}/api/webhook/call-events`

    console.log(`📡 Manual webhook subscription for account: ${accountId}, location: ${locationId}`)
    
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Missing access token for account' }, { status: 400 })
    }

    if (!locationId) {
      return NextResponse.json({ success: false, error: 'Missing location ID for account' }, { status: 400 })
    }

    const webhookAttempts = [
      {
        name: 'Location-based endpoint',
        url: `https://services.leadconnectorhq.com/locations/${locationId}/webhooks`,
        body: { url: target, events: ['OutboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete'] }
      },
      {
        name: 'V2 webhooks with locationId',
        url: 'https://services.leadconnectorhq.com/v2/webhooks',
        body: { locationId, url: target, events: ['OutboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete'] }
      },
      {
        name: 'V1 webhooks endpoint', 
        url: 'https://services.leadconnectorhq.com/webhooks',
        body: { locationId, url: target, events: ['OutboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete'] }
      }
    ]

    const results: Array<{ attempt: string; ok: boolean; status: number; response: string | object }> = []
    let success = false
    let finalWebhookData = null

    for (const attempt of webhookAttempts) {
      console.log(`🧪 Trying webhook approach: ${attempt.name}`)
      
      try {
        const webhookResponse = await fetch(attempt.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-04-15',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attempt.body),
        })

        const responseText = await webhookResponse.text()
        let webhookData = null
        try {
          webhookData = JSON.parse(responseText)
        } catch {
          webhookData = responseText
        }

        results.push({
          attempt: attempt.name,
          ok: webhookResponse.ok,
          status: webhookResponse.status,
          response: webhookData
        })

        console.log(`📞 ${attempt.name} response status: ${webhookResponse.status}`)

        if (webhookResponse.ok) {
          console.log(`✅ Manual webhook subscription successful with: ${attempt.name}`)
          success = true
          finalWebhookData = webhookData
          break
        } else {
          console.log(`❌ ${attempt.name} failed: ${responseText}`)
        }
      } catch (error) {
        console.log(`❌ ${attempt.name} error:`, error)
        results.push({
          attempt: attempt.name,
          ok: false,
          status: 0,
          response: (error as any)?.message || 'Network error'
        })
      }
    }

    return NextResponse.json({
      success,
      target,
      locationId,
      results,
      webhookData: finalWebhookData
    }, { status: success ? 200 : 400 })

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Subscribe Webhooks Helper' })
} 