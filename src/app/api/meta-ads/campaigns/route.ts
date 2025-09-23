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

    // Verify access to account
    const { data: access } = await supabase
      .from('account_access')
      .select('role')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .single()

    if (!access) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Return campaigns from DB for selection
    const { data: campaigns, error } = await supabase
      .from('meta_campaigns')
      .select('id, meta_campaign_id, campaign_name, status, objective')
      .eq('account_id', accountId)
      .order('campaign_name', { ascending: true })

    if (error) {
      console.error('DB error fetching campaigns:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaigns: campaigns || [] })
  } catch (error) {
    console.error('Error in Meta campaigns API:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { accountId, adAccountId, campaignData } = body

    if (!accountId || !adAccountId || !campaignData) {
      return NextResponse.json({ error: 'accountId, adAccountId, and campaignData are required' }, { status: 400 })
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

    console.log('🔄 Syncing Meta campaign data to database for account:', accountId)

    // Sync campaign data to the meta_campaigns table
    const campaignsToSync = Array.isArray(campaignData) ? campaignData : [campaignData]
    
    const syncResults = []
    for (const campaign of campaignsToSync) {
      try {
        // First, ensure the ad account exists in our meta_ad_accounts table
        const { data: existingAdAccount } = await supabase
          .from('meta_ad_accounts')
          .select('id')
          .eq('meta_ad_account_id', adAccountId)
          .eq('account_id', accountId)
          .single()

        if (!existingAdAccount) {
          // Create the ad account record if it doesn't exist
          await supabase
            .from('meta_ad_accounts')
            .insert({
              account_id: accountId,
              meta_ad_account_id: adAccountId,
              meta_ad_account_name: `Ad Account ${adAccountId}`,
              is_active: true
            })
        }

        // Upsert campaign data
        const { data, error } = await supabase
          .from('meta_campaigns')
          .upsert({
            account_id: accountId,
            meta_campaign_id: campaign.id,
            campaign_name: campaign.name,
            objective: campaign.objective,
            status: campaign.status,
            daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
            lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'account_id,meta_campaign_id'
          })
          .select()

        if (error) {
          console.error('Error syncing campaign:', campaign.id, error)
          syncResults.push({ campaignId: campaign.id, success: false, error: error.message })
        } else {
          syncResults.push({ campaignId: campaign.id, success: true, data })
        }
      } catch (error) {
        console.error('Error processing campaign:', campaign.id, error)
        syncResults.push({ campaignId: campaign.id, success: false, error: 'Processing error' })
      }
    }

    const successCount = syncResults.filter(r => r.success).length
    console.log(`✅ Successfully synced ${successCount}/${campaignsToSync.length} campaigns`)

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount}/${campaignsToSync.length} campaigns`,
      results: syncResults
    })

  } catch (error) {
    console.error('Error in Meta campaigns sync API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 