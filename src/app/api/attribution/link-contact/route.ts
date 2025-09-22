import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { session_id, contact_id, email, link_timestamp } = body;

    if (!session_id || !contact_id) {
      return NextResponse.json({ 
        error: 'session_id and contact_id are required' 
      }, { status: 400 });
    }

    console.log(`🔗 Linking attribution session ${session_id} to contact ${contact_id}`);

    // Get the attribution session
    const { data: session, error: sessionError } = await supabase
      .from('attribution_sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('Attribution session not found:', sessionError);
      return NextResponse.json({ 
        error: 'Attribution session not found' 
      }, { status: 404 });
    }

    // Get the contact to determine account
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, account_id, email, attribution_source, last_attribution_source')
      .eq('id', contact_id)
      .single();

    if (contactError || !contact) {
      console.error('Contact not found:', contactError);
      return NextResponse.json({ 
        error: 'Contact not found' 
      }, { status: 404 });
    }

    // Create enhanced attribution data
    const enhancedAttribution = {
      // Preserve existing attribution if any
      ...contact.attribution_source,
      
      // Add Promethean internal tracking data
      promethean_session_id: session_id,
      promethean_fingerprint_id: session.fingerprint_id,
      promethean_attribution_quality: session.attribution_quality,
      promethean_attribution_method: session.attribution_method,
      
      // Enhanced Meta ad data
      meta_campaign_id: session.meta_campaign_id,
      meta_ad_set_id: session.meta_ad_set_id,
      meta_ad_id: session.meta_ad_id,
      meta_campaign_name: session.meta_campaign_name,
      meta_ad_set_name: session.meta_ad_set_name,
      meta_ad_name: session.meta_ad_name,
      
      // Browser and session data
      landing_url: session.landing_url,
      referrer_url: session.referrer_url,
      screen_resolution: session.screen_resolution,
      timezone_offset: session.timezone_offset,
      language: session.language,
      
      // Timestamps
      attribution_linked_at: link_timestamp || new Date().toISOString(),
      session_first_visit: session.first_visit_at,
      session_last_activity: session.last_activity_at
    };

    // Update the contact with enhanced attribution
    const { error: updateContactError } = await supabase
      .from('contacts')
      .update({
        attribution_source: enhancedAttribution,
        last_attribution_source: enhancedAttribution,
        updated_at: new Date().toISOString()
      })
      .eq('id', contact_id);

    if (updateContactError) {
      console.error('Failed to update contact attribution:', updateContactError);
      return NextResponse.json({ 
        error: 'Failed to update contact attribution' 
      }, { status: 500 });
    }

    // Link the session to the contact
    const { error: linkError } = await supabase
      .from('attribution_sessions')
      .update({
        contact_id: contact_id,
        linked_at: link_timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('session_id', session_id);

    if (linkError) {
      console.error('Failed to link attribution session:', linkError);
      return NextResponse.json({ 
        error: 'Failed to link attribution session' 
      }, { status: 500 });
    }

    // Try to create campaign attribution record if we have Meta ad data
    if (session.meta_campaign_id || session.meta_ad_id) {
      try {
        const campaignAttributionData = {
          account_id: contact.account_id,
          platform: 'meta',
          campaign_id: session.meta_campaign_id || 'unknown',
          campaign_name: session.meta_campaign_name || session.utm_campaign,
          ad_set_id: session.meta_ad_set_id,
          ad_set_name: session.meta_ad_set_name,
          ad_id: session.meta_ad_id,
          ad_name: session.meta_ad_name,
          utm_source: session.utm_source,
          utm_medium: session.utm_medium,
          utm_campaign: session.utm_campaign,
          utm_content: session.utm_content,
          utm_term: session.utm_term
        };

        const { data: campaignAttribution, error: campaignError } = await supabase
          .from('campaign_attribution')
          .upsert(campaignAttributionData, {
            onConflict: 'account_id,platform,campaign_id'
          })
          .select()
          .single();

        if (!campaignError && campaignAttribution) {
          // Update appointments and discoveries with campaign attribution
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

          console.log(`✅ Created campaign attribution record for contact ${contact_id}`);
        }
      } catch (error) {
        console.error('Error creating campaign attribution:', error);
        // Don't fail the main request for this
      }
    }

    console.log(`✅ Successfully linked attribution session ${session_id} to contact ${contact_id}`);

    return NextResponse.json({
      success: true,
      session_id: session_id,
      contact_id: contact_id,
      attribution_quality: session.attribution_quality,
      attribution_method: session.attribution_method,
      enhanced_attribution: enhancedAttribution
    });

  } catch (error) {
    console.error('Error linking attribution to contact:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 