import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Helper function to find attribution session by multiple methods
async function findAttributionSession(
  supabase: any, 
  contactEmail: string, 
  contactPhone: string,
  ghlContactData: any,
  timeWindow: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<any> {
  
  const timeWindowStart = new Date(Date.now() - timeWindow).toISOString();
  
  // Method 1: Try to find by form submission data (if session_id was passed)
  const prometheanSessionId = ghlContactData.customField?.find((field: any) => 
    field.key === 'promethean_session_id' || field.name === 'promethean_session_id'
  )?.value;

  if (prometheanSessionId) {
    const { data: sessionByForm } = await supabase
      .from('attribution_sessions')
      .select('*')
      .eq('session_id', prometheanSessionId)
      .single();
    
    if (sessionByForm) {
      console.log(`✅ Found attribution session by form data: ${prometheanSessionId}`);
      return sessionByForm;
    }
  }

  // Method 2: Find by FBCLID if present in GHL data
  const fbclid = ghlContactData.attributionSource?.fbclid || 
                ghlContactData.lastAttributionSource?.fbclid;
  
  if (fbclid) {
    const { data: sessionByFbclid } = await supabase
      .from('attribution_sessions')
      .select('*')
      .eq('fbclid', fbclid)
      .gte('first_visit_at', timeWindowStart)
      .order('first_visit_at', { ascending: false })
      .limit(1)
      .single();
    
    if (sessionByFbclid) {
      console.log(`✅ Found attribution session by FBCLID: ${fbclid}`);
      return sessionByFbclid;
    }
  }

  // Method 3: Find by UTM campaign + time window
  const utmCampaign = ghlContactData.attributionSource?.campaign || 
                     ghlContactData.attributionSource?.utmCampaign ||
                     ghlContactData.lastAttributionSource?.campaign;
  
  if (utmCampaign) {
    const { data: sessionByUTM } = await supabase
      .from('attribution_sessions')
      .select('*')
      .eq('utm_campaign', utmCampaign)
      .gte('first_visit_at', timeWindowStart)
      .order('first_visit_at', { ascending: false })
      .limit(1)
      .single();
    
    if (sessionByUTM) {
      console.log(`✅ Found attribution session by UTM campaign: ${utmCampaign}`);
      return sessionByUTM;
    }
  }

  // Method 4: Find by browser fingerprint (if available)
  const fingerprintId = ghlContactData.customField?.find((field: any) => 
    field.key === 'promethean_fingerprint_id' || field.name === 'promethean_fingerprint_id'
  )?.value;

  if (fingerprintId) {
    const { data: sessionByFingerprint } = await supabase
      .from('attribution_sessions')
      .select('*')
      .eq('fingerprint_id', fingerprintId)
      .gte('first_visit_at', timeWindowStart)
      .order('first_visit_at', { ascending: false })
      .limit(1)
      .single();
    
    if (sessionByFingerprint) {
      console.log(`✅ Found attribution session by fingerprint: ${fingerprintId}`);
      return sessionByFingerprint;
    }
  }

  console.log(`❌ No attribution session found for contact with email: ${contactEmail}`);
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { contact_id, ghl_contact_data, webhook_type } = body;

    if (!contact_id || !ghl_contact_data) {
      return NextResponse.json({ 
        error: 'contact_id and ghl_contact_data are required' 
      }, { status: 400 });
    }

    console.log(`🎯 Enhancing webhook attribution for contact: ${contact_id}`);

    // Get the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      console.error('Contact not found:', contactError);
      return NextResponse.json({ 
        error: 'Contact not found' 
      }, { status: 404 });
    }

    // Find matching attribution session
    const attributionSession = await findAttributionSession(
      supabase,
      contact.email,
      contact.phone,
      ghl_contact_data
    );

    if (!attributionSession) {
      console.log(`ℹ️ No internal attribution session found for contact ${contact_id}`);
      return NextResponse.json({
        success: true,
        enhanced: false,
        message: 'No internal attribution session found'
      });
    }

    // Create enhanced attribution data combining GHL + internal tracking
    const enhancedAttribution = {
      // Original GHL attribution
      ...contact.attribution_source,
      
      // Enhanced with internal tracking
      promethean_session_id: attributionSession.session_id,
      promethean_fingerprint_id: attributionSession.fingerprint_id,
      promethean_attribution_quality: attributionSession.attribution_quality,
      promethean_attribution_method: attributionSession.attribution_method,
      
      // Meta ad details (high confidence)
      meta_campaign_id: attributionSession.meta_campaign_id,
      meta_ad_set_id: attributionSession.meta_ad_set_id,
      meta_ad_id: attributionSession.meta_ad_id,
      meta_campaign_name: attributionSession.meta_campaign_name,
      meta_ad_set_name: attributionSession.meta_ad_set_name,
      meta_ad_name: attributionSession.meta_ad_name,
      
      // Enhanced browser data
      landing_url: attributionSession.landing_url,
      referrer_url: attributionSession.referrer_url,
      screen_resolution: attributionSession.screen_resolution,
      timezone_offset: attributionSession.timezone_offset,
      language: attributionSession.language,
      
      // Quality indicators
      attribution_enhanced_at: new Date().toISOString(),
      attribution_enhancement_method: 'promethean_internal',
      original_ghl_attribution: contact.attribution_source
    };

    // Update contact with enhanced attribution
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        attribution_source: enhancedAttribution,
        last_attribution_source: enhancedAttribution,
        updated_at: new Date().toISOString()
      })
      .eq('id', contact_id);

    if (updateError) {
      console.error('Failed to update contact with enhanced attribution:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update contact attribution' 
      }, { status: 500 });
    }

    // Link the session to the contact
    const { error: linkError } = await supabase
      .from('attribution_sessions')
      .update({
        contact_id: contact_id,
        linked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', attributionSession.session_id);

    if (linkError) {
      console.error('Failed to link attribution session to contact:', linkError);
      // Don't fail the request for this
    }

    // Create or update campaign attribution if we have Meta ad data
    if (attributionSession.meta_campaign_id || attributionSession.meta_ad_id) {
      try {
        const campaignAttributionData = {
          account_id: contact.account_id,
          platform: 'meta',
          campaign_id: attributionSession.meta_campaign_id || 'unknown',
          campaign_name: attributionSession.meta_campaign_name || attributionSession.utm_campaign,
          ad_set_id: attributionSession.meta_ad_set_id,
          ad_set_name: attributionSession.meta_ad_set_name,
          ad_id: attributionSession.meta_ad_id,
          ad_name: attributionSession.meta_ad_name,
          utm_source: attributionSession.utm_source,
          utm_medium: attributionSession.utm_medium,
          utm_campaign: attributionSession.utm_campaign,
          utm_content: attributionSession.utm_content,
          utm_term: attributionSession.utm_term
        };

        const { data: campaignAttribution, error: campaignError } = await supabase
          .from('campaign_attribution')
          .upsert(campaignAttributionData, {
            onConflict: 'account_id,platform,campaign_id'
          })
          .select()
          .single();

        if (!campaignError && campaignAttribution) {
          // Update any existing appointments/discoveries for this contact
          await supabase
            .from('appointments')
            .update({ campaign_attribution_id: campaignAttribution.id })
            .eq('contact_id', contact_id)
            .is('campaign_attribution_id', null);

          await supabase
            .from('discoveries')
            .update({ campaign_attribution_id: campaignAttribution.id })
            .eq('contact_id', contact_id)
            .is('campaign_attribution_id', null);

          console.log(`✅ Enhanced campaign attribution for contact ${contact_id}`);
        }
      } catch (error) {
        console.error('Error creating enhanced campaign attribution:', error);
      }
    }

    console.log(`✅ Successfully enhanced attribution for contact ${contact_id} with session ${attributionSession.session_id}`);

    return NextResponse.json({
      success: true,
      enhanced: true,
      contact_id: contact_id,
      session_id: attributionSession.session_id,
      attribution_quality: attributionSession.attribution_quality,
      attribution_method: attributionSession.attribution_method,
      meta_ad_data: {
        campaign_id: attributionSession.meta_campaign_id,
        ad_set_id: attributionSession.meta_ad_set_id,
        ad_id: attributionSession.meta_ad_id,
        campaign_name: attributionSession.meta_campaign_name,
        ad_name: attributionSession.meta_ad_name
      }
    });

  } catch (error) {
    console.error('Error enhancing webhook attribution:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 