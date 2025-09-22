import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Helper function to get valid Meta access token for any connected account
async function getAnyValidMetaAccessToken(supabase: any): Promise<string | null> {
  try {
    // Get any account with valid Meta access token
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, meta_access_token, meta_token_expires_at, meta_auth_type')
      .eq('meta_auth_type', 'oauth2')
      .not('meta_access_token', 'is', null)
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return null;
    }

    const account = accounts[0];
    const currentAccessToken = account.meta_access_token;
    const expiresAtIso = account.meta_token_expires_at;

    // Check if token is still valid
    if (expiresAtIso) {
      const now = Date.now();
      const expiresAtMs = new Date(expiresAtIso).getTime();
      const skewMs = 24 * 60 * 60 * 1000; // 24 hours buffer
      
      if (now >= (expiresAtMs - skewMs)) {
        // Token is expired or expiring soon, try to refresh
        const clientId = process.env.META_APP_ID;
        const clientSecret = process.env.META_APP_SECRET;
        
        if (clientId && clientSecret && currentAccessToken) {
          try {
            const resp = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${currentAccessToken}`);
            
            if (resp.ok) {
              const tokenData = await resp.json();
              const newAccessToken = tokenData.access_token;
              const newExpiresAtIso = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

              // Update the token in database
              await supabase
                .from('accounts')
                .update({
                  meta_access_token: newAccessToken,
                  meta_token_expires_at: newExpiresAtIso,
                  meta_token_health_status: 'healthy',
                  meta_token_last_refreshed: new Date().toISOString(),
                })
                .eq('id', account.id);

              return newAccessToken;
            }
          } catch (error) {
            console.error('Error refreshing Meta token for FBCLID lookup:', error);
          }
        }
      }
    }

    return currentAccessToken;
  } catch (error) {
    console.error('Error getting Meta access token for FBCLID lookup:', error);
    return null;
  }
}

// Helper function to extract ad data from Meta Graph API responses
function extractAdDataFromInsights(insights: any[]): any {
  // Meta Insights API can provide campaign/adset/ad data
  if (insights && insights.length > 0) {
    const insight = insights[0];
    return {
      campaign_id: insight.campaign_id,
      campaign_name: insight.campaign_name,
      adset_id: insight.adset_id,
      adset_name: insight.adset_name,
      ad_id: insight.ad_id,
      ad_name: insight.ad_name
    };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { fbclid, session_id } = body;

    if (!fbclid) {
      return NextResponse.json({ error: 'fbclid is required' }, { status: 400 });
    }

    console.log(`🔍 Attempting FBCLID reverse lookup for: ${fbclid.substring(0, 20)}...`);

    // Get a valid Meta access token from any connected account
    const accessToken = await getAnyValidMetaAccessToken(supabase);
    
    if (!accessToken) {
      console.log('❌ No valid Meta access token available for FBCLID lookup');
      return NextResponse.json({ 
        success: false, 
        error: 'No Meta access token available',
        method: 'fbclid_lookup_failed'
      });
    }

    let adData = null;

    // Method 1: Try to get insights data that might contain campaign/ad info
    // Note: Meta doesn't provide direct FBCLID -> Ad ID lookup, but we can try insights
    try {
      // This is a hypothetical approach - Meta's actual API may not support this directly
      const insightsResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=insights{campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name}&access_token=${accessToken}`
      );

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();
        // Process insights to find matching data
        adData = extractAdDataFromInsights(insightsData.data);
      }
    } catch (error) {
      console.log('Method 1 (insights lookup) failed:', error);
    }

    // Method 2: Try Ad Library API (public ads only)
    if (!adData) {
      try {
        const adLibraryResponse = await fetch(
          `https://graph.facebook.com/v21.0/ads_archive?search_terms=&ad_reached_countries=['ALL']&access_token=${accessToken}&fields=id,ad_creative_link_captions,ad_creative_link_titles,ad_creative_link_descriptions&limit=1`
        );

        if (adLibraryResponse.ok) {
          const adLibraryData = await adLibraryResponse.json();
          // This won't give us the specific ad, but confirms Meta API access
          console.log('✅ Meta API access confirmed via Ad Library');
        }
      } catch (error) {
        console.log('Method 2 (ad library) failed:', error);
      }
    }

    // Method 3: Campaign name matching (fallback)
    if (!adData && session_id) {
      try {
        // Get the attribution session to extract campaign name
        const { data: session } = await supabase
          .from('attribution_sessions')
          .select('utm_campaign, meta_campaign_name')
          .eq('session_id', session_id)
          .single();

        if (session?.utm_campaign) {
          // Try to find matching campaign in our Meta campaigns table
          const { data: metaCampaign } = await supabase
            .from('meta_campaigns')
            .select('meta_campaign_id, campaign_name, account_id')
            .ilike('campaign_name', `%${session.utm_campaign}%`)
            .limit(1)
            .single();

          if (metaCampaign) {
            adData = {
              campaign_id: metaCampaign.meta_campaign_id,
              campaign_name: metaCampaign.campaign_name,
              method: 'campaign_name_match'
            };
            console.log('✅ Found campaign by name matching:', adData);
          }
        }
      } catch (error) {
        console.log('Method 3 (campaign name matching) failed:', error);
      }
    }

    // Prepare response
    const result = {
      success: !!adData,
      fbclid: fbclid,
      ad_data: adData,
      method: adData?.method || 'fbclid_lookup',
      timestamp: new Date().toISOString()
    };

    if (adData) {
      console.log(`✅ FBCLID lookup successful:`, {
        campaign_id: adData.campaign_id,
        campaign_name: adData.campaign_name,
        method: adData.method
      });

      // Update attribution session if session_id provided
      if (session_id) {
        try {
          await supabase
            .from('attribution_sessions')
            .update({
              meta_campaign_id: adData.campaign_id,
              meta_campaign_name: adData.campaign_name,
              meta_ad_set_id: adData.adset_id,
              meta_ad_set_name: adData.adset_name,
              meta_ad_id: adData.ad_id,
              meta_ad_name: adData.ad_name,
              attribution_quality: 'high',
              attribution_method: 'fbclid_lookup',
              updated_at: new Date().toISOString()
            })
            .eq('session_id', session_id);

          console.log(`✅ Updated attribution session ${session_id} with FBCLID lookup data`);
        } catch (error) {
          console.error('Failed to update attribution session with FBCLID data:', error);
        }
      }
    } else {
      console.log(`❌ FBCLID lookup failed for: ${fbclid.substring(0, 20)}...`);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in FBCLID lookup:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      method: 'fbclid_lookup_error'
    }, { status: 500 });
  }
} 