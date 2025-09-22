import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

// Rate limiting utilities for Meta API
const RATE_LIMIT_DELAY = 1000 // 1 second between requests (reduced for fewer calls)
const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 3000 // 3 seconds base delay (reduced for faster recovery)

// Sync optimization settings
const MAX_CAMPAIGNS_PER_BATCH = 5 // Further limit campaigns processed in a single sync
const ENABLE_AD_LEVEL_SYNC = false // Disable detailed ad sync to reduce API calls
const CAMPAIGNS_ONLY_MODE = true // Skip ad sets and ads entirely for minimal API usage

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function makeMetaApiCall(url: string, retryCount = 0): Promise<Response> {
  try {
    // Add delay between requests to respect rate limits
    if (retryCount > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1) // Exponential backoff
      console.log(`⏳ Rate limit hit, waiting ${delay}ms before retry ${retryCount}/${MAX_RETRIES}...`)
      await sleep(delay)
    } else {
      // Always add a small delay between requests
      await sleep(RATE_LIMIT_DELAY)
    }

    const response = await fetch(url)
    
    // Check if we hit rate limits
    if (response.status === 400) {
      const errorText = await response.text()
      const errorData = JSON.parse(errorText)
      
      if (errorData.error?.code === 17 || errorData.error?.message?.includes('request limit')) {
        console.log(`🚫 Rate limit detected for URL: ${url}`)
        
        if (retryCount < MAX_RETRIES) {
          console.log(`🔄 Retrying request (${retryCount + 1}/${MAX_RETRIES})...`)
          return makeMetaApiCall(url, retryCount + 1)
        } else {
          console.error(`❌ Max retries (${MAX_RETRIES}) exceeded for URL: ${url}`)
          throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries: ${errorData.error.message}`)
        }
      }
      
      // Re-create response for non-rate-limit 400 errors
      return new Response(errorText, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }
    
    return response
  } catch (error) {
    if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('Rate limit')) {
      return makeMetaApiCall(url, retryCount + 1)
    }
    throw error
  }
}

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

async function syncCampaignDataBatched(accountId: string, metaAdAccountId: string, accessToken: string, supabase: any, syncType: string = 'full') {
  console.log(`🔄 Syncing campaign data BATCHED for ad account: ${metaAdAccountId} (mode: ${syncType})`)
  
  // For quick sync, use ultra-efficient batched approach
  if (syncType === 'campaigns') {
    return await syncCampaignStructureBatched(accountId, metaAdAccountId, accessToken, supabase)
  }
  
  // For full sync, include insights
  return await syncCampaignWithInsightsBatched(accountId, metaAdAccountId, accessToken, supabase)
}

// Ultra-efficient batch sync for campaign structure only
async function syncCampaignStructureBatched(accountId: string, metaAdAccountId: string, accessToken: string, supabase: any) {
  try {
    console.log(`⚡ Ultra-fast campaign structure sync for ${metaAdAccountId}`)
    
    // Single API call to get ALL campaigns, ad sets, and ads in one request using batch
    const batchRequests = [
      {
        method: 'GET',
        relative_url: `${metaAdAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=50`
      },
      {
        method: 'GET', 
        relative_url: `${metaAdAccountId}/adsets?fields=id,name,status,campaign_id,daily_budget,lifetime_budget,targeting&limit=200`
      },
      {
        method: 'GET',
        relative_url: `${metaAdAccountId}/ads?fields=id,name,status,adset_id,creative&limit=500`
      }
    ]

    console.log(`📡 Making single batched API call for all campaign structure data`)
    const batchResponse = await fetch('https://graph.facebook.com/v21.0/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        access_token: accessToken,
        batch: JSON.stringify(batchRequests)
      })
    })

    if (!batchResponse.ok) {
      throw new Error(`Batch request failed: ${batchResponse.statusText}`)
    }

    const batchResults = await batchResponse.json()
    console.log(`✅ Batch API call completed, processing ${batchResults.length} responses`)

    // Process batch results
    const campaigns = JSON.parse(batchResults[0].body).data || []
    const adSets = JSON.parse(batchResults[1].body).data || []  
    const ads = JSON.parse(batchResults[2].body).data || []

    console.log(`📊 Batch results: ${campaigns.length} campaigns, ${adSets.length} ad sets, ${ads.length} ads`)

    // Get database records for this ad account
    const { data: metaAdAccount } = await supabase
      .from('meta_ad_accounts')
      .select('id')
      .eq('meta_ad_account_id', metaAdAccountId)
      .eq('account_id', accountId)
      .single()

    if (!metaAdAccount) {
      throw new Error(`Meta ad account ${metaAdAccountId} not found in database`)
    }

    // Batch upsert campaigns (limit to 5 for quick sync)
    const campaignsToSync = campaigns.slice(0, 5)
    const campaignUpserts = campaignsToSync.map((campaign: any) => ({
      account_id: accountId,
      meta_ad_account_id: metaAdAccount.id,
      meta_campaign_id: campaign.id,
      campaign_name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) : null,
      lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) : null,
      updated_at: new Date().toISOString()
    }))

    if (campaignUpserts.length > 0) {
      const { error: campaignError } = await supabase
        .from('meta_campaigns')
        .upsert(campaignUpserts, { onConflict: 'account_id,meta_campaign_id' })
      
      if (campaignError) {
        console.error('Error batch upserting campaigns:', campaignError)
      } else {
        console.log(`✅ Batch upserted ${campaignUpserts.length} campaigns`)
      }
    }

         return {
       success: true,
       campaignsSynced: campaignUpserts.length,
       totalCampaigns: campaigns.length,
       adSetsSynced: adSets.length,
       adsSynced: ads.length,
       apiCallsUsed: 1, // Only 1 batch API call!
       error: undefined
     }

  } catch (error) {
    console.error(`❌ Error in batched campaign structure sync:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Batch sync with daily insights
async function syncCampaignWithInsightsBatched(accountId: string, metaAdAccountId: string, accessToken: string, supabase: any) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    console.log(`📊 Batched sync with daily insights for ${metaAdAccountId}`)
    
    // Two batch calls: structure + insights
    const structureResult = await syncCampaignStructureBatched(accountId, metaAdAccountId, accessToken, supabase)
    
    if (!structureResult.success) {
      return structureResult
    }

    // Single insights call for today only
    const insightsResponse = await makeMetaApiCall(
      `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,cpm,cpc,ctr,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name&time_range={'since':'${today}','until':'${today}'}&level=ad&access_token=${accessToken}`
    )

    let insights = []
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json()
      insights = insightsData.data || []
      console.log(`📈 Got ${insights.length} insight records for today`)
    }

         return {
       success: true,
       campaignsSynced: structureResult.campaignsSynced,
       totalCampaigns: structureResult.totalCampaigns,
       insightsSynced: insights.length,
       apiCallsUsed: 2, // Structure batch + insights = 2 total calls
       error: undefined
     }

  } catch (error) {
    console.error(`❌ Error in batched campaign + insights sync:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Legacy function for backwards compatibility
async function syncCampaignData(accountId: string, metaAdAccountId: string, accessToken: string, supabase: any, syncType: string = 'full') {
  console.log(`🔄 Syncing campaign data for ad account: ${metaAdAccountId} (mode: ${syncType})`)
  
  // Override campaigns-only mode based on sync type
  const campaignsOnlyMode = syncType === 'campaigns' || CAMPAIGNS_ONLY_MODE
  
  try {
    // Fetch campaigns from Meta API with rate limiting
    const campaignsResponse = await makeMetaApiCall(
      `https://graph.facebook.com/v21.0/${metaAdAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time,start_time,stop_time&access_token=${accessToken}`
    )

    if (!campaignsResponse.ok) {
      throw new Error(`Failed to fetch campaigns: ${campaignsResponse.statusText}`)
    }

    const campaignsData = await campaignsResponse.json()
    const allCampaigns = campaignsData.data || []
    
    // Limit campaigns to process in a single batch to reduce API calls
    const campaigns = allCampaigns.slice(0, MAX_CAMPAIGNS_PER_BATCH)

    console.log(`📊 Found ${allCampaigns.length} campaigns for ad account ${metaAdAccountId}`)
    if (allCampaigns.length > MAX_CAMPAIGNS_PER_BATCH) {
      console.log(`⚡ Processing first ${MAX_CAMPAIGNS_PER_BATCH} campaigns to respect rate limits`)
    }

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
          
          // Sync ad sets for this campaign (only if not in campaigns-only mode)
          if (!campaignsOnlyMode) {
            await syncAdSetsForCampaign(accountId, metaAdAccountId, campaign.id, accessToken, supabase, metaAdAccount.id)
          } else {
            console.log(`⚡ Skipping ad sets sync for campaign ${campaign.id} (campaigns-only mode)`)
          }
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
    
    // Fetch ad sets from Meta API with rate limiting
    const adSetsResponse = await makeMetaApiCall(
      `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting&access_token=${accessToken}`
    )

    if (!adSetsResponse.ok) {
      const errorText = await adSetsResponse.text();
      console.error(`Failed to fetch ad sets for campaign ${campaignId}:`, adSetsResponse.statusText);
      console.error(`Error details:`, {
        status: adSetsResponse.status,
        statusText: adSetsResponse.statusText,
        error: errorText,
        campaignId
      });
      
      // Don't throw error, just log and continue with other campaigns
      return {
        success: false,
        error: `${adSetsResponse.statusText}: ${errorText}`,
        campaignId
      };
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
        } else if (ENABLE_AD_LEVEL_SYNC) {
          // Sync ads for this ad set (only if enabled to reduce API calls)
          await syncAdsForAdSet(accountId, adSet.id, accessToken, supabase, adSetData[0].id)
        } else {
          console.log(`⚡ Skipping ad-level sync for ad set ${adSet.id} to reduce API calls`)
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
    
    // Fetch ads from Meta API with rate limiting
    const adsResponse = await makeMetaApiCall(
      `https://graph.facebook.com/v21.0/${adSetId}/ads?fields=id,name,status,creative&access_token=${accessToken}`
    )

    if (!adsResponse.ok) {
      const errorText = await adsResponse.text();
      console.error(`Failed to fetch ads for ad set ${adSetId}:`, adsResponse.statusText);
      console.error(`Error details:`, {
        status: adsResponse.status,
        statusText: adsResponse.statusText,
        error: errorText,
        adSetId
      });
      
      // Don't throw error, just log and continue
      return {
        success: false,
        error: `${adsResponse.statusText}: ${errorText}`,
        adSetId
      };
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

    console.log(`📅 Fetching daily insights from ${dateStart} to ${dateEnd}`)

    // Try multiple approaches to get comprehensive data
    let insightsResponse;
    let insights = [];

    // Approach 1: Use the working method from debug - specific date range
    try {
      const coreFields = [
        'impressions', 'clicks', 'spend', 'reach', 'frequency',
        'cpm', 'cpc', 'ctr', 'actions', 'action_values',
        'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name'
      ].join(',');

      // Use specific date range (this worked in debug with $8,916 spend)
      insightsResponse = await makeMetaApiCall(
        `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=${coreFields}&time_range={'since':'${dateStart}','until':'${dateEnd}'}&time_increment=1&level=campaign&access_token=${accessToken}`
      )

      if (insightsResponse.ok) {
        const specificRangeData = await insightsResponse.json()
        insights = specificRangeData.data || []
        console.log(`📊 Specific date range insights: Found ${insights.length} records`)
        console.log(`💰 Total spend found: $${insights.reduce((sum: number, record: any) => sum + parseFloat(record.spend || '0'), 0)}`)
      }
    } catch (error) {
      console.log('Specific date range insights failed, trying ad-level...')
    }

    // Approach 2: Try specific date range if maximum didn't work
    if (insights.length === 0) {
      try {
        const coreFields = [
          'impressions', 'clicks', 'spend', 'reach', 'frequency',
          'cpm', 'cpc', 'ctr', 'actions', 'action_values',
          'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name'
        ].join(',');

        insightsResponse = await makeMetaApiCall(
          `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=${coreFields}&time_range={'since':'${dateStart}','until':'${dateEnd}'}&time_increment=1&level=ad&access_token=${accessToken}`
        )

        if (insightsResponse.ok) {
          const adLevelData = await insightsResponse.json()
          insights = adLevelData.data || []
          console.log(`📊 Ad-level insights: Found ${insights.length} records`)
        }
      } catch (error) {
        console.log('Ad-level insights failed, trying campaign-level...')
      }
    }

    // Approach 3: Fallback to campaign-level if ad-level fails or returns limited data
    if (insights.length === 0) {
      try {
        insightsResponse = await makeMetaApiCall(
          `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,actions,action_values,campaign_id,campaign_name&date_preset=maximum&time_increment=1&level=campaign&access_token=${accessToken}`
        )

        if (insightsResponse.ok) {
          const campaignLevelData = await insightsResponse.json()
          let campaignInsights = campaignLevelData.data || []
          
          // Filter to our desired date range
          campaignInsights = campaignInsights.filter((insight: any) => {
            const insightDate = new Date(insight.date_start)
            const startFilter = new Date(dateStart)
            const endFilter = new Date(dateEnd)
            return insightDate >= startFilter && insightDate <= endFilter
          })
          
          insights = campaignInsights
          console.log(`📊 Campaign-level insights: Found ${insights.length} records`)
        }
      } catch (error) {
        console.log('Campaign-level insights also failed')
      }
    }

    // Approach 4: Try account-level for maximum data coverage
    if (insights.length === 0) {
      try {
        insightsResponse = await fetch(
          `https://graph.facebook.com/v21.0/${metaAdAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpm,cpc,ctr,actions,action_values&date_preset=maximum&time_increment=1&level=account&access_token=${accessToken}`
        )

        if (insightsResponse.ok) {
          const accountLevelData = await insightsResponse.json()
          let accountInsights = accountLevelData.data || []
          
          // Filter to our desired date range
          accountInsights = accountInsights.filter((insight: any) => {
            const insightDate = new Date(insight.date_start)
            const startFilter = new Date(dateStart)
            const endFilter = new Date(dateEnd)
            return insightDate >= startFilter && insightDate <= endFilter
          })
          
          insights = accountInsights
          console.log(`📊 Account-level insights: Found ${insights.length} records`)
        }
      } catch (error) {
        console.log('Account-level insights also failed')
      }
    }

    if (insights.length === 0) {
      console.warn(`⚠️ No insights data available for ${metaAdAccountId} from ${dateStart} to ${dateEnd}`)
      return {
        success: true,
        insightsSynced: 0,
        totalInsights: 0,
        dateRange: { start: dateStart, end: dateEnd },
        message: 'No insights data available for this date range'
      }
    }

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

    // Sync each daily insight record
    for (const insight of insights) {
      try {
        // Find the corresponding campaign
        const { data: campaign } = await supabase
          .from('meta_campaigns')
          .select('id')
          .eq('meta_campaign_id', insight.campaign_id)
          .eq('account_id', accountId)
          .single()

        // Use the actual date from the insight (daily data)
        const insightDate = insight.date_start || dateStart
        
        // Find the corresponding ad and ad set
        const { data: metaAd } = await supabase
          .from('meta_ads')
          .select('id')
          .eq('meta_ad_id', insight.ad_id)
          .eq('account_id', accountId)
          .single()

        const { data: metaAdSet } = await supabase
          .from('meta_ad_sets')
          .select('id')
          .eq('meta_ad_set_id', insight.adset_id)
          .eq('account_id', accountId)
          .single()

        // Extract specific metrics from actions array
        const actions = insight.actions || []
        const actionValues = insight.action_values || []
        
        const getActionValue = (actionType: string) => {
          const action = actions.find((a: any) => a.action_type === actionType)
          return action ? parseInt(action.value || '0') : 0
        }

        const getActionValueCost = (actionType: string) => {
          const actionValue = actionValues.find((a: any) => a.action_type === actionType)
          return actionValue ? parseFloat(actionValue.value || '0') : 0
        }
        
        const { data, error } = await supabase
          .from('meta_ad_performance')
          .upsert({
            account_id: accountId,
            meta_ad_account_id: metaAdAccount.id,
            meta_campaign_id: campaign?.id || null,
            meta_ad_set_id: metaAdSet?.id || null,
            meta_ad_id: metaAd?.id || null,
            date_start: insightDate,
            date_end: insightDate, // Daily data - start and end are the same
            
            // Core metrics
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            spend: parseFloat(insight.spend || '0'),
            reach: parseInt(insight.reach || '0'),
            frequency: parseFloat(insight.frequency || '0'),
            cpm: parseFloat(insight.cpm || '0'),
            cpc: parseFloat(insight.cpc || '0'),
            ctr: parseFloat(insight.ctr || '0'),
            
            // Conversion metrics
            conversions: parseInt(insight.conversions || '0'),
            conversion_values: parseFloat(insight.conversion_values || '0'),
            cost_per_result: parseFloat(insight.cost_per_result || '0'),
            cost_per_conversion: parseFloat(insight.cost_per_conversion || '0'),
            
            // Purchase and ROAS metrics
            purchase_roas: parseFloat(insight.purchase_roas || insight.return_on_ad_spend || '0'),
            purchase_value: getActionValueCost('purchase'),
            purchases: getActionValue('purchase'),
            cost_per_purchase: parseFloat(insight.cost_per_purchase || '0'),
            
            // Video metrics
            video_views: getActionValue('video_view'),
            video_views_25_percent: getActionValue('video_p25_watched_actions'),
            video_views_50_percent: getActionValue('video_p50_watched_actions'),
            video_views_75_percent: getActionValue('video_p75_watched_actions'),
            video_views_100_percent: getActionValue('video_p100_watched_actions'),
            cost_per_video_view: parseFloat(insight.cost_per_thruplay || '0'),
            
            // Engagement metrics
            post_engagements: getActionValue('post_engagement'),
            page_engagements: getActionValue('page_engagement'),
            link_clicks: getActionValue('link_click'),
            landing_page_views: getActionValue('landing_page_view'),
            cost_per_landing_page_view: parseFloat(insight.cost_per_landing_page_view || '0'),
            
            // Lead metrics
            leads: getActionValue('lead'),
            lead_value: getActionValueCost('lead'),
            cost_per_lead: parseFloat(insight.cost_per_lead || '0'),
            cost_per_lead_actual: parseFloat(insight.lead_generation_cost_per_result || '0'),
            
            // Social metrics
            likes: getActionValue('like'),
            comments: getActionValue('comment'),
            shares: getActionValue('share'),
            post_reactions: getActionValue('post_reaction'),
            
            // App metrics
            app_installs: getActionValue('app_install'),
            cost_per_app_install: parseFloat(insight.cost_per_app_install || '0'),
            app_store_clicks: getActionValue('app_store_click'),
            
            // Advanced conversion metrics
            add_to_cart: getActionValue('add_to_cart'),
            initiate_checkout: getActionValue('initiate_checkout'),
            add_payment_info: getActionValue('add_payment_info'),
            complete_registration: getActionValue('complete_registration'),
            
            // Messaging metrics
            messaging_conversations_started: getActionValue('onsite_conversion.messaging_conversation_started_7d'),
            messaging_first_reply: getActionValue('onsite_conversion.messaging_first_reply'),
            
            // Quality metrics
            quality_score: parseFloat(insight.quality_score_ectr || '0'),
            relevance_score: parseFloat(insight.quality_score_ecvr || '0'),
            engagement_rate: parseFloat(insight.engagement_rate || '0'),
            
            // Raw data preservation
            actions: insight.actions || null,
            action_values: insight.action_values || null,
            
            // Attribution windows
            attribution_1d_view: {
              conversions: parseInt(insight.conversions_1d_view || '0'),
              conversion_values: parseFloat(insight.conversion_values_1d_view || '0')
            },
            attribution_7d_click: {
              conversions: parseInt(insight.conversions_7d_click || '0'),
              conversion_values: parseFloat(insight.conversion_values_7d_click || '0')
            },
            attribution_28d_click: {
              conversions: parseInt(insight.conversions_28d_click || '0'),
              conversion_values: parseFloat(insight.conversion_values_28d_click || '0')
            },
            
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
        error: null as string | null
      }

      try {
        // Sync campaign data using batched approach
        if (syncType === 'full' || syncType === 'campaigns') {
          const campaignResult = await syncCampaignDataBatched(
            accountId, 
            metaAdAccount.meta_ad_account_id, 
            accessToken, 
            supabase,
            syncType
          )
          
          if (campaignResult.success) {
            adAccountResult.campaigns = { 
              success: true, 
              count: campaignResult.campaignsSynced || 0 
            }
            syncResults.campaignsSynced += campaignResult.campaignsSynced || 0
          } else {
            adAccountResult.error = campaignResult.error || 'Campaign sync failed'
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
            adAccountResult.error = insightsResult.error || 'Insights sync failed'
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
    // Verify cron secret for security (Vercel cron jobs don't send this header automatically)
    const cronSecret = request.headers.get('x-cron-secret')
    const authHeader = request.headers.get('authorization')
    
    // Allow Vercel cron jobs (no secret header) or manual calls with secret
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') || 
                        request.headers.get('x-vercel-cron') === '1'
    
    if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
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

          // Sync recent performance data (last 1 day for hourly updates)
          const insightsResult = await syncPerformanceData(
            account.id, 
            metaAdAccount.meta_ad_account_id, 
            accessToken, 
            supabase, 
            1 // Only sync yesterday and today for hourly cron jobs
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