import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Helper function to get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// Helper function to enhance attribution with Meta API lookup
async function enhanceWithMetaLookup(attributionData: any): Promise<any> {
  const enhanced = { ...attributionData };
  
  try {
    // If we have FBCLID but missing ad IDs, try reverse lookup
    if (attributionData.fbclid && !attributionData.meta_ad_id) {
      // Note: This would require Meta Graph API endpoint that supports FBCLID lookup
      // Currently, Meta doesn't provide direct FBCLID -> Ad ID lookup
      // But we can enhance with campaign name matching
      
      if (attributionData.utm_campaign) {
        enhanced.meta_campaign_name = attributionData.utm_campaign;
        enhanced.attribution_quality = 'high';
      }
    }

    // Extract Meta ad IDs from UTM parameters
    if (attributionData.utm_content && /^\d{15,}$/.test(attributionData.utm_content)) {
      enhanced.meta_ad_id = attributionData.utm_content;
      enhanced.attribution_quality = 'perfect';
    }

    if (attributionData.utm_term && /^\d{15,}$/.test(attributionData.utm_term)) {
      enhanced.meta_ad_set_id = attributionData.utm_term;
    }

    if (attributionData.utm_id && /^\d{15,}$/.test(attributionData.utm_id)) {
      enhanced.meta_campaign_id = attributionData.utm_id;
    }

    // Use explicit ad IDs if provided
    if (attributionData.ad_id) {
      enhanced.meta_ad_id = attributionData.ad_id;
      enhanced.attribution_quality = 'perfect';
    }

    if (attributionData.adset_id) {
      enhanced.meta_ad_set_id = attributionData.adset_id;
    }

    if (attributionData.campaign_id) {
      enhanced.meta_campaign_id = attributionData.campaign_id;
    }

    // Determine attribution method
    if (enhanced.meta_ad_id && enhanced.meta_campaign_id) {
      enhanced.attribution_method = 'utm_direct';
    } else if (attributionData.fbclid) {
      enhanced.attribution_method = 'fbclid_lookup';
    } else if (attributionData.meta_pixel_data?.pixel_loaded) {
      enhanced.attribution_method = 'pixel_bridge';
    } else {
      enhanced.attribution_method = 'fingerprint_match';
    }

  } catch (error) {
    console.error('Error enhancing attribution with Meta lookup:', error);
  }
  
  return enhanced;
}

// Basic CORS helper and handlers
function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '86400');
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { type, session_id, ...attributionData } = body;

    if (!session_id) {
      return withCors(NextResponse.json({ error: 'session_id is required' }, { status: 400 }));
    }

    console.log(`🎯 Attribution tracking: ${type} for session ${session_id}`);

    // Get client IP
    const clientIP = getClientIP(request);

    // Enhance attribution data with Meta API lookup
    const enhancedData = await enhanceWithMetaLookup(attributionData);

    // Prepare session data for database
    const sessionData = {
      session_id: session_id,
      fingerprint_id: enhancedData.fingerprint_id,
      
      // URL and referrer data
      landing_url: enhancedData.landing_url,
      referrer_url: enhancedData.referrer,
      page_title: enhancedData.page_title,
      
      // UTM parameters
      utm_source: enhancedData.utm_source,
      utm_medium: enhancedData.utm_medium,
      utm_campaign: enhancedData.utm_campaign,
      utm_content: enhancedData.utm_content,
      utm_term: enhancedData.utm_term,
      utm_id: enhancedData.utm_id,
      
      // Meta-specific parameters
      fbclid: enhancedData.fbclid,
      fbp: enhancedData.fbp || enhancedData.meta_pixel_data?.fbp,
      fbc: enhancedData.fbc || enhancedData.meta_pixel_data?.fbc,
      
      // Meta ad IDs
      meta_campaign_id: enhancedData.meta_campaign_id,
      meta_ad_set_id: enhancedData.meta_ad_set_id,
      meta_ad_id: enhancedData.meta_ad_id,
      
      // Meta ad details
      meta_campaign_name: enhancedData.meta_campaign_name,
      meta_ad_set_name: enhancedData.meta_ad_set_name,
      meta_ad_name: enhancedData.meta_ad_name,
      
      // Browser and device data
      user_agent: enhancedData.user_agent,
      ip_address: clientIP,
      screen_resolution: enhancedData.screen_resolution,
      timezone_offset: enhancedData.timezone_offset,
      language: enhancedData.language,
      
      // Attribution quality and method
      attribution_quality: enhancedData.attribution_quality || 'medium',
      attribution_method: enhancedData.attribution_method || 'utm_direct',
      
      // Raw data
      raw_attribution_data: attributionData,
      meta_pixel_data: enhancedData.meta_pixel_data,
      additional_data: {
        type: type,
        timestamp: enhancedData.timestamp,
        raw_url: enhancedData.raw_url,
        all_params: enhancedData.all_params
      },
      
      last_activity_at: new Date().toISOString()
    };

    // Upsert session data
    const { data, error } = await supabase
      .from('attribution_sessions')
      .upsert(sessionData, {
        onConflict: 'session_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing attribution session:', error);
      return withCors(NextResponse.json({ error: 'Failed to store attribution data' }, { status: 500 }));
    }

    console.log(`✅ Attribution session stored: ${session_id} (${enhancedData.attribution_quality} quality)`);

    return withCors(NextResponse.json({
      success: true,
      session_id: session_id,
      attribution_quality: enhancedData.attribution_quality,
      attribution_method: enhancedData.attribution_method,
      enhanced: !!enhancedData.meta_ad_id
    }));

  } catch (error) {
    console.error('Error in attribution tracking:', error);
    return withCors(NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 }));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { session_id, updates } = body;

    if (!session_id) {
      return withCors(NextResponse.json({ error: 'session_id is required' }, { status: 400 }));
    }

    // Update session with new activity data
    const { error } = await supabase
      .from('attribution_sessions')
      .update({
        ...updates,
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', session_id);

    if (error) {
      console.error('Error updating attribution session:', error);
      return withCors(NextResponse.json({ error: 'Failed to update session' }, { status: 500 }));
    }

    return withCors(NextResponse.json({ success: true }));

  } catch (error) {
    console.error('Error updating attribution session:', error);
    return withCors(NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 }));
  }
} 