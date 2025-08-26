import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json({ error: 'accountId parameter is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get account with GHL data
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const locationId = account.ghl_location_id
    const accessToken = account.ghl_api_key
    const authType = account.ghl_auth_type

    console.log('🔍 Checking webhook status for account:', {
      accountId,
      locationId,
      hasAccessToken: !!accessToken,
      authType
    })

    if (!accessToken || !locationId) {
      return NextResponse.json({
        error: 'Account missing GHL access token or location ID',
        account: {
          id: accountId,
          name: account.name,
          hasAccessToken: !!accessToken,
          hasLocationId: !!locationId,
          authType
        }
      }, { status: 400 })
    }

    // Check current webhook subscriptions
    const webhookEndpoints = [
      `https://services.leadconnectorhq.com/locations/${locationId}/webhooks`,
      'https://services.leadconnectorhq.com/v2/webhooks',
      'https://services.leadconnectorhq.com/webhooks'
    ]

    const webhookStatuses = []

    for (const endpoint of webhookEndpoints) {
      try {
        console.log(`🔍 Checking webhooks at: ${endpoint}`)
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
        })

        let responseData = null
        const responseText = await response.text()
        
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        webhookStatuses.push({
          endpoint,
          status: response.status,
          ok: response.ok,
          data: responseData
        })

        console.log(`📊 ${endpoint} status: ${response.status}`, responseData)

      } catch (error) {
        console.error(`❌ Error checking ${endpoint}:`, error)
        webhookStatuses.push({
          endpoint,
          status: 0,
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // Check recent webhook logs for this account
    const { data: recentLogs, error: logsError } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('location_id', locationId)
      .order('timestamp', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error('Error fetching webhook logs:', logsError)
    }

    // Check if the webhook URL is configured correctly
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const expectedWebhookUrl = `${appUrl}/api/webhook/call-events`

    return NextResponse.json({
      account: {
        id: accountId,
        name: account.name,
        locationId,
        authType,
        hasAccessToken: !!accessToken,
        tokenExpiresAt: account.ghl_token_expires_at
      },
      expectedWebhookUrl,
      webhookStatuses,
      recentLogs: recentLogs || [],
      diagnostics: {
        totalRecentLogs: recentLogs?.length || 0,
        hasRecentActivity: (recentLogs?.length || 0) > 0,
        lastWebhookReceived: recentLogs?.[0]?.timestamp || null,
        appUrl
      }
    })

  } catch (error) {
    console.error('Error checking webhook status:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, action } = body

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (action === 'resubscribe') {
      // Re-subscribe webhooks for this account
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const target = `${appUrl}/api/webhook/call-events`
      const events = ['OutboundMessage', 'InboundMessage', 'AppointmentCreate', 'AppointmentUpdate', 'AppointmentDelete', 'ContactCreate', 'ContactUpdate']

      console.log(`🔄 Re-subscribing webhooks for account ${accountId}`)

      const webhookResponse = await fetch(`https://services.leadconnectorhq.com/locations/${account.ghl_location_id}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.ghl_api_key}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: target, events }),
      })

      const responseText = await webhookResponse.text()
      let responseData = null
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = responseText
      }

      return NextResponse.json({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        target,
        events,
        response: responseData
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in webhook status action:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 