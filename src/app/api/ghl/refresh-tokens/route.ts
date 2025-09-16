import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Helper function to refresh GHL tokens (reusable across the app)
async function refreshGhlToken(account: any, supabase: any): Promise<{
  success: boolean
  newAccessToken?: string
  error?: string
  needsReauth?: boolean
}> {
  try {
    const authType = account.ghl_auth_type || 'oauth2'
    const currentAccessToken = account.ghl_api_key as string | null
    const refreshToken = account.ghl_refresh_token as string | null
    const expiresAtIso = account.ghl_token_expires_at as string | null

    // Skip non-OAuth accounts
    if (authType !== 'oauth2') {
      return { success: true, newAccessToken: currentAccessToken || undefined }
    }

    const clientId = process.env.GHL_CLIENT_ID
    const clientSecret = process.env.GHL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Missing GHL OAuth credentials' }
    }

    if (!refreshToken) {
      return { success: false, error: 'No refresh token available', needsReauth: true }
    }

    // Check if token actually needs refreshing
    const now = Date.now()
    const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0
    const skewMs = 24 * 60 * 60 * 1000 // 24 hours buffer for proactive renewal
    const needsRefresh = !currentAccessToken || !expiresAtMs || now >= (expiresAtMs - skewMs)

    if (!needsRefresh) {
      return { success: true, newAccessToken: currentAccessToken as string }
    }

    // Attempt token refresh
    const resp = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      console.error(`❌ Token refresh failed for account ${account.id}:`, errorText)
      
      // Check if it's a refresh token expiry issue
      if (resp.status === 400 || resp.status === 401) {
        return { success: false, error: 'Refresh token expired', needsReauth: true }
      }
      
      return { success: false, error: `HTTP ${resp.status}: ${errorText}` }
    }

    const tokenData = await resp.json()
    const newAccessToken = tokenData.access_token as string
    const newRefreshToken = (tokenData.refresh_token as string) || refreshToken
    const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString()

    // Update database with new tokens
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        ghl_api_key: newAccessToken,
        ghl_refresh_token: newRefreshToken,
        ghl_token_expires_at: newExpiresAtIso,
        ghl_token_last_refreshed: new Date().toISOString(),
      })
      .eq('id', account.id)

    if (updateError) {
      console.error(`❌ Failed to update tokens for account ${account.id}:`, updateError)
      return { success: false, error: 'Database update failed' }
    }

    console.log(`✅ Successfully refreshed token for account ${account.id}`)
    return { success: true, newAccessToken }
  } catch (err) {
    console.error(`❌ Token refresh error for account ${account.id}:`, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  console.log('🔄 Starting GHL token refresh...')
  
  // Verify cron secret for security (allow manual-refresh for UI calls)
  const cronSecret = request.headers.get('x-cron-secret')
  if (cronSecret !== process.env.CRON_SECRET && cronSecret !== 'manual-refresh') {
    console.error('❌ Invalid cron secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if this is a manual refresh for a specific account
  const body = await request.json().catch(() => ({}))
  const { accountId: specificAccountId, manual } = body

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get accounts with GHL OAuth connections (specific account if manual refresh)
    let query = supabase
      .from('accounts')
      .select('id, name, ghl_api_key, ghl_refresh_token, ghl_token_expires_at, ghl_auth_type, ghl_token_last_refreshed')
      .eq('ghl_auth_type', 'oauth2')
      .not('ghl_refresh_token', 'is', null)
    
    if (specificAccountId) {
      query = query.eq('id', specificAccountId)
    }
    
    const { data: accounts, error: accountsError } = await query

    if (accountsError) {
      console.error('❌ Failed to fetch accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      console.log('ℹ️ No OAuth accounts found')
      return NextResponse.json({ 
        success: true, 
        message: 'No OAuth accounts to process',
        processed: 0,
        refreshed: 0,
        errors: 0,
        needsReauth: 0
      })
    }

    console.log(`📋 Found ${accounts.length} OAuth accounts to check`)

    const results = {
      processed: 0,
      refreshed: 0,
      errors: 0,
      needsReauth: 0,
      details: [] as any[]
    }

    // Process each account
    for (const account of accounts) {
      results.processed++
      
      const refreshResult = await refreshGhlToken(account, supabase)
      
      const accountResult = {
        accountId: account.id,
        accountName: account.name,
        success: refreshResult.success,
        error: refreshResult.error,
        needsReauth: refreshResult.needsReauth || false
      }

      if (refreshResult.success) {
        if (refreshResult.newAccessToken !== account.ghl_api_key) {
          results.refreshed++
          console.log(`✅ Refreshed token for account: ${account.name}`)
        } else {
          console.log(`ℹ️ Token still valid for account: ${account.name}`)
        }
      } else {
        results.errors++
        if (refreshResult.needsReauth) {
          results.needsReauth++
          console.log(`⚠️ Account needs re-authentication: ${account.name}`)
        } else {
          console.log(`❌ Failed to refresh token for account: ${account.name} - ${refreshResult.error}`)
        }
      }

      results.details.push(accountResult)
    }

    // Log summary
    console.log(`🏁 Token refresh complete:`)
    console.log(`  - Processed: ${results.processed}`)
    console.log(`  - Refreshed: ${results.refreshed}`)
    console.log(`  - Errors: ${results.errors}`)
    console.log(`  - Need Re-auth: ${results.needsReauth}`)

    return NextResponse.json({
      success: true,
      message: 'Token refresh completed',
      ...results
    })

  } catch (error) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

// Also export the refresh function for reuse in other parts of the app
export { refreshGhlToken } 