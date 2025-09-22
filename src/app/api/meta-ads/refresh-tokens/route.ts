import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Helper function to refresh Meta tokens (reusable across the app)
async function refreshMetaToken(account: any, supabase: any): Promise<{
  success: boolean
  newAccessToken?: string
  error?: string
  needsReauth?: boolean
}> {
  try {
    const authType = account.meta_auth_type || 'oauth2'
    const currentAccessToken = account.meta_access_token as string | null
    const expiresAtIso = account.meta_token_expires_at as string | null

    // Skip non-OAuth accounts
    if (authType !== 'oauth2') {
      return { success: true, newAccessToken: currentAccessToken || undefined }
    }

    const clientId = process.env.META_APP_ID
    const clientSecret = process.env.META_APP_SECRET

    if (!clientId || !clientSecret) {
      return { success: false, error: 'Missing Meta OAuth credentials' }
    }

    if (!currentAccessToken) {
      return { success: false, error: 'No access token available', needsReauth: true }
    }

    // Check if token actually needs refreshing
    const now = Date.now()
    const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0
    const skewMs = 7 * 24 * 60 * 60 * 1000 // 7 days buffer for proactive renewal
    const needsRefresh = !expiresAtMs || now >= (expiresAtMs - skewMs)

    if (!needsRefresh) {
      return { success: true, newAccessToken: currentAccessToken as string }
    }

    // Attempt token exchange for long-lived token
    const resp = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${currentAccessToken}`)

    if (!resp.ok) {
      const errorText = await resp.text()
      console.error('Meta token refresh failed:', errorText)
      
      // Check if it's an auth error that requires re-authentication
      if (resp.status === 401 || resp.status === 403) {
        return { success: false, error: 'Token refresh failed - re-authentication required', needsReauth: true }
      }
      
      return { success: false, error: `Token refresh failed: ${errorText}` }
    }

    const tokenData = await resp.json()
    const newAccessToken = tokenData.access_token as string
    const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString()

    // Update the database with new token info
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        meta_access_token: newAccessToken,
        meta_token_expires_at: newExpiresAtIso,
        meta_token_health_status: 'healthy',
        meta_token_last_refreshed: new Date().toISOString(),
      })
      .eq('id', account.id)

    if (updateError) {
      console.error('Failed to update Meta token in database:', updateError)
      return { success: false, error: 'Failed to save refreshed token' }
    }

    console.log('✅ Meta token refreshed successfully for account:', account.id)
    return { success: true, newAccessToken }

  } catch (err) {
    console.error('Error refreshing Meta token:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function POST(request: NextRequest) {
  console.log('🔄 Starting Meta token refresh...')
  
  // Verify cron secret for security (allow manual-refresh for UI calls and Vercel cron)
  const cronSecret = request.headers.get('x-cron-secret')
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') || 
                      request.headers.get('x-vercel-cron') === '1'
  
  if (!isVercelCron && cronSecret !== process.env.CRON_SECRET && cronSecret !== 'manual-refresh') {
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
    // Get accounts with Meta OAuth connections (specific account if manual refresh)
    let query = supabase
      .from('accounts')
      .select('id, name, meta_access_token, meta_token_expires_at, meta_auth_type, meta_token_last_refreshed')
      .eq('meta_auth_type', 'oauth2')
      .not('meta_access_token', 'is', null)
    
    if (specificAccountId) {
      query = query.eq('id', specificAccountId)
    }
    
    const { data: accounts, error: accountsError } = await query

    if (accountsError) {
      console.error('❌ Failed to fetch accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      console.log('ℹ️ No Meta OAuth accounts found')
      return NextResponse.json({ 
        success: true, 
        message: 'No Meta OAuth accounts to process',
        processed: 0,
        refreshed: 0,
        errors: 0,
        needsReauth: 0
      })
    }

    console.log(`📋 Found ${accounts.length} Meta OAuth accounts to check`)

    const results = {
      processed: 0,
      refreshed: 0,
      errors: 0,
      needsReauth: 0,
      details: [] as any[]
    }

    // Process each account
    for (const account of accounts) {
      console.log(`🔄 Processing account: ${account.name} (${account.id})`)
      results.processed++

      const result = await refreshMetaToken(account, supabase)
      
      const accountResult = {
        accountId: account.id,
        accountName: account.name,
        success: result.success,
        error: result.error,
        needsReauth: result.needsReauth
      }

      if (result.success && result.newAccessToken !== account.meta_access_token) {
        console.log(`✅ Token refreshed for account: ${account.name}`)
        results.refreshed++
      } else if (result.success) {
        console.log(`ℹ️ Token still valid for account: ${account.name}`)
      } else if (result.needsReauth) {
        console.log(`⚠️ Re-authentication needed for account: ${account.name}`)
        results.needsReauth++
        
        // Update token health status
        await supabase
          .from('accounts')
          .update({ meta_token_health_status: 'needs_reauth' })
          .eq('id', account.id)
      } else {
        console.log(`❌ Error refreshing token for account: ${account.name} - ${result.error}`)
        results.errors++
        
        // Update token health status
        await supabase
          .from('accounts')
          .update({ meta_token_health_status: 'expired' })
          .eq('id', account.id)
      }

      results.details.push(accountResult)
    }

    console.log('📊 Meta token refresh summary:', {
      processed: results.processed,
      refreshed: results.refreshed,
      errors: results.errors,
      needsReauth: results.needsReauth
    })

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} accounts`,
      ...results
    })

  } catch (error) {
    console.error('❌ Error in Meta token refresh process:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 