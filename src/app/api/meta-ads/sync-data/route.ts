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

async function syncCampaignData(accountId: string, metaAdAccountId: string, accessToken: string, supabase: any) {
  console.log(`🔄 Syncing campaign data for ad account: ${metaAdAccountId}`)
  
  try {
    // Fetch campaigns from Meta API
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${metaAdAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time&access_token=${accessToken}`
    )

    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.statusText}`)
    }

    const campaignsData = await campaignsResponse.json()
    const campaigns = campaignsData.data || []

    console.log(`📊 Found ${campaigns.length} campaigns for ad account ${metaAdAccountId}`)

    // Get the meta_ad_account record
    const { data: metaAdAccount } = await supabase
      .from('meta_ad_accounts')
      .select('id')
      .eq('meta_ad_account_id', metaAdAccountId)
      .eq('account_id', accountId)
      .single()

    if (!metaAdAccount) {
      throw new Error(`Meta ad account ${metaAdAccountId} not found in database`)
    }

    const syncResults = []

    // Sync each campaign
    for (const campaign of campaigns) {
      try {
        const { data, error } = await supabase
          .from('meta_campaigns')
          .upsert({
            account_id: accountId,
            meta_ad_account_id: metaAdAccount.id,
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
          console.error(`❌ Error syncing campaign ${campaign.id}:`, error)
          syncResults.push({ campaignId: campaign.id, success: false, error: error.message })
        } else {
          syncResults.push({ campaignId: campaign.id, success: true })
          
          // Sync ad sets for this campaign
          await syncAdSetsForCampaign(accountId, metaAdAccountId, campaign.id, accessToken, supabase, metaAdAccount.id)
        }
      } catch (error) {
        console.error(`❌ Error processing campaign ${campaign.id}:`, error)
        syncResults.push({ campaignId: campaign.id, success: false, error: 'Processing error' })
      }
    }

    return {
      success: true,
      campaignsSynced: syncResults.filter(r => r.success).length,
      totalCampaigns: campaigns.length,
      details: syncResults
    }

  } catch (error) {
    console.error(`❌ Error syncing campaign data for ${metaAdAccountId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function syncAdSetsForCampaign(accountId: string, metaAdAccountId: string, campaignId: string, accessToken: string, supabase: any, metaAdAccountDbId: string) {
  try {
    console.log(`🔄 Syncing ad sets for campaign: ${campaignId}`)
    
    // Fetch ad sets from Meta API
    const adSetsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting&access_token=${accessToken}`
    )

    if (!adSetsResponse.ok) {
      console.error(`Failed to fetch ad sets for campaign ${campaignId}:`, adSetsResponse.statusText)
      return
    }

    const adSetsData = await adSetsResponse.json()
    const adSets = adSetsData.data || []

    console.log(`📊 Found ${adSets.length} ad sets for campaign ${campaignId}`)

    // Get the campaign record
    const { data: campaign } = await supabase
      .from('meta_campaigns')
      .select('id')
      .eq('meta_campaign_id', campaignId)
      .eq('account_id', accountId)
      .single()

    if (!campaign) {
      console.error(`Campaign ${campaignId} not found in database`)
      return
    }

    // Sync each ad set
    for (const adSet of adSets) {
      try {
        const { data: adSetData, error } = await supabase
          .from('meta_ad_sets')
          .upsert({
            account_id: accountId,
            meta_campaign_id: campaign.id,
            meta_ad_set_id: adSet.id,
            ad_set_name: adSet.name,
            status: adSet.status || null,
            daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) : null,
            lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) : null,
            targeting_data: adSet.targeting ? adSet.targeting : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'account_id,meta_ad_set_id'
          })
          .select()

        if (error) {
          console.error(`❌ Error syncing ad set ${adSet.id}:`, error)
        } else {
          // Sync ads for this ad set
          await syncAdsForAdSet(accountId, adSet.id, accessToken, supabase, adSetData[0].id)
        }
      } catch (error) {
        console.error(`❌ Error processing ad set ${adSet.id}:`, error)
      }
    }

  } catch (error) {
    console.error(`❌ Error syncing ad sets for campaign ${campaignId}:`, error)
  }
}

async function syncAdsForAdSet(accountId: string, adSetId: string, accessToken: string, supabase: any, metaAdSetDbId: string) {
  try {
    console.log(`🔄 Syncing ads for ad set: ${adSetId}`)
    
    // Fetch ads from Meta API
    const adsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${adSetId}/ads?fields=id,name,status,creative&access_token=${accessToken}`
    )

    if (!adsResponse.ok) {
      console.error(`Failed to fetch ads for ad set ${adSetId}:`, adsResponse.statusText)
      return
    }

    const adsData = await adsResponse.json()
    const ads = adsData.data || []

    console.log(`📊 Found ${ads.length} ads for ad set ${adSetId}`)

    // Sync each ad
    for (const ad of ads) {
      try {
        const { error } = await supabase
          .from('meta_ads')
          .upsert({
            account_id: accountId,
            meta_ad_set_id: metaAdSetDbId,
            meta_ad_id: ad.id,
            ad_name: ad.name,
            status: ad.status || null,
            creative_data: ad.creative ? ad.creative : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'account_id,meta_ad_id'
          })

        if (error) {
          console.error(`❌ Error syncing ad ${ad.id}:`, error)
        }
      } catch (error) {
        console.error(`❌ Error processing ad ${ad.id}:`, error)
      }
    }

  } catch (error) {
    console.error(`❌ Error syncing ads for ad set ${adSetId}:`, error)
  }
}

async function syncPerformanceData(accountId: string, metaAdAccountId: string, accessToken: string, supabase: any, daysBack: number = 90) {
  console.log(`📈 Syncing performance data for ad account: ${metaAdAccountId} (${daysBack} days)`)
  
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const dateStart = startDate.toISOString().split('T')[0]
    const dateEnd = endDate.toISOString().split('T')[0]

    console.log(`📅 Fetching insights from ${dateStart} to ${dateEnd}`)

    // Fetch insights from Meta API
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,actions,action_values,conversions,conversion_values,cpm,cpc,ctr&time_range={'since':'${dateStart}','until':'${dateEnd}'}&level=campaign&access_token=${accessToken}`
    )

    if (!insightsResponse.ok) {
      throw new Error(`Failed to fetch insights: ${insightsResponse.statusText}`)
    }

    const insightsData = await insightsResponse.json()
    const insights = insightsData.data || []

    console.log(`📊 Found ${insights.length} insight records for ad account ${metaAdAccountId}`)

    // Get the meta_ad_account record
    const { data: metaAdAccount } = await supabase
      .from('meta_ad_accounts')
      .select('id')
      .eq('meta_ad_account_id', metaAdAccountId)
      .eq('account_id', accountId)
      .single()

    if (!metaAdAccount) {
      throw new Error(`Meta ad account ${metaAdAccountId} not found in database`)
    }

    const syncResults = []

    // Sync each insight record
    for (const insight of insights) {
      try {
        // Find the corresponding campaign
        const { data: campaign } = await supabase
          .from('meta_campaigns')
          .select('id')
          .eq('meta_campaign_id', insight.campaign_id)
          .eq('account_id', accountId)
          .single()

        const { data, error } = await supabase
          .from('meta_ad_performance')
          .upsert({
            account_id: accountId,
            meta_ad_account_id: metaAdAccount.id,
            meta_campaign_id: campaign?.id || null,
            date_start: dateStart,
            date_end: dateEnd,
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            spend: parseFloat(insight.spend || '0'),
            reach: parseInt(insight.reach || '0'),
            frequency: parseFloat(insight.frequency || '0'),
            actions: insight.actions || null,
            action_values: insight.action_values || null,
            conversions: parseInt(insight.conversions || '0'),
            conversion_values: parseFloat(insight.conversion_values || '0'),
            cpm: parseFloat(insight.cpm || '0'),
            cpc: parseFloat(insight.cpc || '0'),
            ctr: parseFloat(insight.ctr || '0'),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'account_id,meta_ad_account_id,date_start,date_end,meta_campaign_id'
          })
          .select()

        if (error) {
          console.error(`❌ Error syncing performance data:`, error)
          syncResults.push({ campaignId: insight.campaign_id, success: false, error: error.message })
        } else {
          syncResults.push({ campaignId: insight.campaign_id, success: true })
        }
      } catch (error) {
        console.error(`❌ Error processing insight:`, error)
        syncResults.push({ campaignId: insight.campaign_id, success: false, error: 'Processing error' })
      }
    }

    return {
      success: true,
      insightsSynced: syncResults.filter(r => r.success).length,
      totalInsights: insights.length,
      dateRange: { start: dateStart, end: dateEnd },
      details: syncResults
    }

  } catch (error) {
    console.error(`❌ Error syncing performance data for ${metaAdAccountId}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
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
    const { accountId, daysBack = 90, syncType = 'full' } = body

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
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

    // Get mapped ad accounts for this client
    const { data: metaAdAccounts, error: adAccountsError } = await supabase
      .from('meta_ad_accounts')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)

    if (adAccountsError) {
      return NextResponse.json({ error: 'Failed to fetch mapped ad accounts' }, { status: 500 })
    }

    if (!metaAdAccounts || metaAdAccounts.length === 0) {
      return NextResponse.json({ 
        error: 'No active Meta ad accounts mapped to this client. Please map ad accounts first.' 
      }, { status: 400 })
    }

    console.log(`🔄 Starting Meta Ads data sync for account ${accountId}`)
    console.log(`📊 Found ${metaAdAccounts.length} mapped ad accounts`)
    console.log(`📅 Syncing ${daysBack} days of data (sync type: ${syncType})`)

    const syncResults = {
      accountId,
      totalAdAccounts: metaAdAccounts.length,
      campaignsSynced: 0,
      insightsSynced: 0,
      errors: 0,
      adAccountResults: [] as any[]
    }

    // Process each mapped ad account
    for (const metaAdAccount of metaAdAccounts) {
      console.log(`🔄 Processing ad account: ${metaAdAccount.meta_ad_account_name} (${metaAdAccount.meta_ad_account_id})`)
      
      const adAccountResult = {
        adAccountId: metaAdAccount.meta_ad_account_id,
        adAccountName: metaAdAccount.meta_ad_account_name,
        campaigns: { success: false, count: 0 },
        insights: { success: false, count: 0 },
        error: null
      }

      try {
        // Sync campaign data
        if (syncType === 'full' || syncType === 'campaigns') {
          const campaignResult = await syncCampaignData(
            accountId, 
            metaAdAccount.meta_ad_account_id, 
            accessToken, 
            supabase
          )
          
          if (campaignResult.success) {
            adAccountResult.campaigns = { 
              success: true, 
              count: campaignResult.campaignsSynced || 0 
            }
            syncResults.campaignsSynced += campaignResult.campaignsSynced || 0
          } else {
            adAccountResult.error = campaignResult.error
            syncResults.errors++
          }
        }

        // Sync performance data
        if (syncType === 'full' || syncType === 'insights') {
          const insightsResult = await syncPerformanceData(
            accountId, 
            metaAdAccount.meta_ad_account_id, 
            accessToken, 
            supabase, 
            daysBack
          )
          
          if (insightsResult.success) {
            adAccountResult.insights = { 
              success: true, 
              count: insightsResult.insightsSynced || 0 
            }
            syncResults.insightsSynced += insightsResult.insightsSynced || 0
          } else {
            adAccountResult.error = insightsResult.error
            syncResults.errors++
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ad account ${metaAdAccount.meta_ad_account_id}:`, error)
        adAccountResult.error = error instanceof Error ? error.message : 'Unknown error'
        syncResults.errors++
      }

      syncResults.adAccountResults.push(adAccountResult)
    }

    console.log(`✅ Meta Ads sync completed for account ${accountId}:`, {
      campaignsSynced: syncResults.campaignsSynced,
      insightsSynced: syncResults.insightsSynced,
      errors: syncResults.errors
    })

    return NextResponse.json({
      success: true,
      message: `Synced data for ${metaAdAccounts.length} ad accounts`,
      ...syncResults
    })

  } catch (error) {
    console.error('❌ Error in Meta Ads sync:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Cron job endpoint for automated sync
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      console.error('❌ Invalid cron secret')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    console.log('🔄 Starting automated Meta Ads sync for all connected accounts...')

    // Get all accounts with active Meta Ads connections
    const { data: connectedAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, meta_access_token, meta_user_id, meta_auth_type, meta_token_expires_at')
      .not('meta_access_token', 'is', null)
      .eq('meta_auth_type', 'oauth2')

    if (accountsError) {
      console.error('❌ Failed to fetch connected accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    if (!connectedAccounts || connectedAccounts.length === 0) {
      console.log('ℹ️ No Meta Ads connected accounts found')
      return NextResponse.json({ 
        success: true, 
        message: 'No connected accounts to sync',
        processed: 0
      })
    }

    console.log(`📋 Found ${connectedAccounts.length} connected accounts`)

    const cronResults = {
      processed: 0,
      successful: 0,
      errors: 0,
      totalCampaigns: 0,
      totalInsights: 0,
      details: [] as any[]
    }

    // Process each connected account
    for (const account of connectedAccounts) {
      console.log(`🔄 Processing account: ${account.name} (${account.id})`)
      cronResults.processed++

      try {
        const accessToken = await getValidMetaAccessToken(account, supabase)
        if (!accessToken) {
          throw new Error('No valid access token')
        }

        // Get mapped ad accounts for this account
        const { data: metaAdAccounts } = await supabase
          .from('meta_ad_accounts')
          .select('*')
          .eq('account_id', account.id)
          .eq('is_active', true)

        if (!metaAdAccounts || metaAdAccounts.length === 0) {
          console.log(`ℹ️ No mapped ad accounts for ${account.name}`)
          continue
        }

        let accountCampaigns = 0
        let accountInsights = 0

        // Sync data for each mapped ad account
        for (const metaAdAccount of metaAdAccounts) {
          // Sync campaigns (less frequent - every 5 minutes is fine)
          const campaignResult = await syncCampaignData(
            account.id, 
            metaAdAccount.meta_ad_account_id, 
            accessToken, 
            supabase
          )

          if (campaignResult.success) {
            accountCampaigns += campaignResult.campaignsSynced || 0
          }

          // Sync recent performance data (last 7 days for frequent updates)
          const insightsResult = await syncPerformanceData(
            account.id, 
            metaAdAccount.meta_ad_account_id, 
            accessToken, 
            supabase, 
            7 // Only sync last 7 days for cron jobs
          )

          if (insightsResult.success) {
            accountInsights += insightsResult.insightsSynced || 0
          }
        }

        cronResults.successful++
        cronResults.totalCampaigns += accountCampaigns
        cronResults.totalInsights += accountInsights

        cronResults.details.push({
          accountId: account.id,
          accountName: account.name,
          success: true,
          campaignsSynced: accountCampaigns,
          insightsSynced: accountInsights
        })

      } catch (error) {
        console.error(`❌ Error processing account ${account.name}:`, error)
        cronResults.errors++
        cronResults.details.push({
          accountId: account.id,
          accountName: account.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('📊 Automated Meta Ads sync summary:', {
      processed: cronResults.processed,
      successful: cronResults.successful,
      errors: cronResults.errors,
      totalCampaigns: cronResults.totalCampaigns,
      totalInsights: cronResults.totalInsights
    })

    return NextResponse.json({
      success: true,
      message: `Processed ${cronResults.processed} accounts`,
      ...cronResults
    })

  } catch (error) {
    console.error('❌ Error in automated Meta Ads sync:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 