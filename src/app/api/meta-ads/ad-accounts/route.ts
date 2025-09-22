import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

async function getValidMetaAccessToken(account: any, supabase: any): Promise<string | null> {
  try {
    const authType = account.meta_auth_type || 'oauth2'
    const currentAccessToken = account.meta_access_token as string | null
    const expiresAtIso = account.meta_token_expires_at as string | null

    if (authType !== 'oauth2') return currentAccessToken || null

    const clientId = process.env.META_APP_ID
    const clientSecret = process.env.META_APP_SECRET
    if (!clientId || !clientSecret) return currentAccessToken || null

    const now = Date.now()
    const expiresAtMs = expiresAtIso ? new Date(expiresAtIso).getTime() : 0
    const skewMs = 24 * 60 * 60 * 1000 // 24 hours buffer for proactive renewal
    const needsRefresh = !currentAccessToken || !expiresAtMs || now >= (expiresAtMs - skewMs)
    
    if (!needsRefresh) return currentAccessToken as string

    // For Meta Ads, we need to handle long-lived tokens differently
    // Meta tokens can be exchanged for long-lived tokens that last 60 days
    if (currentAccessToken) {
      try {
        const resp = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${currentAccessToken}`)
        
        if (resp.ok) {
          const tokenData = await resp.json()
          const newAccessToken = tokenData.access_token as string
          const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in as number) * 1000).toISOString()

          await supabase
            .from('accounts')
            .update({
              meta_access_token: newAccessToken,
              meta_token_expires_at: newExpiresAtIso,
              meta_token_health_status: 'healthy',
              meta_token_last_refreshed: new Date().toISOString(),
            })
            .eq('id', account.id)

          return newAccessToken
        }
      } catch (e) {
        console.error('Error refreshing Meta token:', e)
      }
    }

    return currentAccessToken || null
  } catch (e) {
    return account?.meta_access_token || null
  }
}

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

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 })
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // require admin or moderator on this account
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isGlobalAdmin = profile?.role === 'admin'
    if (!isGlobalAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()
      if (!access || !['moderator'].includes(access.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Load account
    const { data: account } = await supabase
      .from('accounts')
      .select('id, name, meta_user_id, meta_access_token, meta_token_expires_at, meta_auth_type')
      .eq('id', accountId)
      .single()
    
    if (!account) {
      return NextResponse.json({ error: 'Account not found or not connected to Meta Ads' }, { status: 404 })
    }

    const accessToken = await getValidMetaAccessToken(account, supabase)
    if (!accessToken) {
      return NextResponse.json({ error: 'No valid Meta access token available' }, { status: 401 })
    }

    console.log('🔍 Fetching Meta ad accounts for account:', accountId)

    // Fetch ad accounts from Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${accessToken}`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Meta API error:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch ad accounts from Meta API',
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('✅ Successfully fetched Meta ad accounts:', data.data?.length || 0)

    return NextResponse.json({
      success: true,
      adAccounts: data.data || []
    })

  } catch (error) {
    console.error('Error in Meta ad accounts API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 