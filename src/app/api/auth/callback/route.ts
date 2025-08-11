import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // GHL may pass account context in state
    const error = searchParams.get('error')

    if (error) {
      console.error('GHL OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/account/crm-connection?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      console.error('No authorization code received from GHL')
      return NextResponse.redirect(
        new URL('/account/crm-connection?error=no_code', request.url)
      )
    }

    // Exchange the authorization code for an access token
    const tokenResponse = await exchangeCodeForToken(code)
    
    if (!tokenResponse.success) {
      console.error('Failed to exchange code for token:', tokenResponse.error)
      return NextResponse.redirect(
        new URL(`/account/crm-connection?error=${encodeURIComponent(tokenResponse.error || 'unknown_error')}`, request.url)
      )
    }

    // Get location info from GHL (optional - don't fail if this doesn't work)
    const locationInfo = await getLocationInfo(tokenResponse.access_token)
    
    if (!locationInfo.success) {
      console.warn('Failed to get location info, continuing without it:', locationInfo.error)
      // Continue without location info - we'll still save the connection
    }

    // Get the account ID from state parameter
    const accountId = state
    
    if (!accountId) {
      console.error('No account ID in state parameter')
      return NextResponse.redirect(
        new URL('/account/crm-connection?error=no_account_id', request.url)
      )
    }

    // Save the connection to the database
    const saveResult = await saveConnection({
      accountId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in,
      locationId: tokenResponse.location_id,
      companyId: tokenResponse.company_id,
      locations: locationInfo.success ? locationInfo.locations : []
    })

    if (!saveResult.success) {
      console.error('Failed to save connection:', saveResult.error)
      return NextResponse.redirect(
        new URL('/account/crm-connection?error=save_failed', request.url)
      )
    }

    // Try to subscribe webhooks (best-effort; do not block UX)
    try {
      await ensureGhlWebhooks({
        accessToken: tokenResponse.access_token,
        locationId: tokenResponse.location_id || (locationInfo.success ? locationInfo.locations?.[0]?.id : undefined),
        targetBaseUrl: process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin,
      })
    } catch (subErr) {
      console.warn('Non-fatal: failed to ensure GHL webhooks:', subErr)
    }

    // Redirect back to CRM connection page with success
    return NextResponse.redirect(
      new URL('/account/crm-connection?success=true', request.url)
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/account/crm-connection?error=callback_failed', request.url)
    )
  }
}

async function exchangeCodeForToken(code: string) {
  try {
    const clientId = process.env.GHL_CLIENT_ID
    const clientSecret = process.env.GHL_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Missing GHL credentials' }
    }

    const tokenEndpoint = 'https://services.leadconnectorhq.com/oauth/token'
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', response.status, errorText)
      return { success: false, error: `Token exchange failed: ${response.status}` }
    }

    const tokenData = await response.json()
    
    return {
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      location_id: tokenData.locationId, // GHL may include this
      company_id: tokenData.companyId, // GHL may include this
    }
  } catch (error) {
    console.error('Error exchanging code for token:', error)
    return { success: false, error: 'Network error during token exchange' }
  }
}

async function getLocationInfo(accessToken: string) {
  try {
    // Get location information from GHL API
    const response = await fetch('https://services.leadconnectorhq.com/locations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to get location info:', response.status, errorText)
      return { success: false, error: `Location info failed: ${response.status}` }
    }

    const locationData = await response.json()
    
    return {
      success: true,
      locations: locationData.locations || [],
    }
  } catch (error) {
    console.error('Error getting location info:', error)
    return { success: false, error: 'Network error getting location info' }
  }
}

interface GHLLocation {
  id: string
  name?: string
}

async function saveConnection(params: {
  accountId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
  locationId?: string
  companyId?: string
  locations: GHLLocation[]
}) {
  try {
    const { accountId, accessToken, refreshToken, expiresIn, locationId, companyId, locations } = params
    
    // Create a service client that bypasses RLS for OAuth operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return { success: false, error: 'Missing configuration' }
    }
    
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
    
    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString()
    
    // Use the first location if no specific location ID is provided
    const ghlLocationId = locationId || (locations.length > 0 ? locations[0].id : null)
    
    // Upsert the connection using service role
    const { error } = await supabaseService
      .from('ghl_connections')
      .upsert({
        account_id: accountId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt,
        ghl_location_id: ghlLocationId,
        ghl_company_id: companyId,
        is_connected: true,
        connection_status: 'connected',
        last_sync_at: new Date().toISOString(),
        error_message: null,
      }, {
        onConflict: 'account_id'
      })

    if (error) {
      console.error('Database error saving connection:', error)
      return { success: false, error: 'Database error' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving connection:', error)
    return { success: false, error: 'Save error' }
  }
}

// Subscribe to required GHL webhooks for the app
async function ensureGhlWebhooks(params: {
  accessToken: string
  locationId?: string | null
  targetBaseUrl: string
}) {
  const { accessToken, locationId, targetBaseUrl } = params
  const target = `${targetBaseUrl.replace(/\/$/, '')}/api/webhooks`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
  }
  if (locationId) headers['Location'] = locationId

  // Helper to subscribe to one event type
  const subscribe = async (eventType: string) => {
    const body: any = { target, eventType }
    // Some tenants expect Location header only; keep body minimal
    const resp = await fetch('https://services.leadconnectorhq.com/webhooks/subscribe/', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const txt = await resp.text().catch(() => '')
      console.warn('Webhook subscribe failed', { eventType, status: resp.status, body: txt })
    } else {
      console.log('Webhook subscribed', { eventType, target })
    }
  }

  // Try a broader set of known event names across GHL variants
  const eventsToTry = [
    'appointment.created',
    'message.created',
    'conversation.message.created',
  ]

  await Promise.allSettled(eventsToTry.map(subscribe))
} 