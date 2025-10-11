#!/usr/bin/env node

/**
 * Script to run the setter backfill using the admin API endpoint
 * This will fetch setter information from GHL API for appointments with "Unknown" setter
 * 
 * Usage: node scripts/run-setter-backfill.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log('🔄 Starting setter backfill from GHL API...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!serviceKey);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Get all appointments with "Unknown" setter
  const { data: unknownSetterAppts, error: fetchError } = await supabase
    .from('appointments')
    .select(`
      id,
      ghl_appointment_id,
      setter,
      setter_user_id,
      account_id,
      date_booked,
      contact_id,
      accounts!inner (
        id,
        name,
        ghl_api_key,
        ghl_location_id,
        ghl_refresh_token,
        ghl_token_expires_at,
        ghl_auth_type
      )
    `)
    .eq('setter', 'Unknown')
    .not('ghl_appointment_id', 'is', null);

  if (fetchError) {
    console.error('❌ Error fetching appointments:', fetchError);
    process.exit(1);
  }

  console.log(`📊 Found ${unknownSetterAppts?.length || 0} appointments with Unknown setter\n`);

  if (!unknownSetterAppts || unknownSetterAppts.length === 0) {
    console.log('✅ No appointments to backfill!');
    process.exit(0);
  }

  let processed = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  // Helper to get valid access token
  async function getValidAccessToken(account) {
    try {
      const authType = account.ghl_auth_type || 'oauth2';
      const currentToken = account.ghl_api_key;
      const refreshToken = account.ghl_refresh_token;
      const expiresAt = account.ghl_token_expires_at;

      if (authType !== 'oauth2') {
        return currentToken;
      }

      const now = Date.now();
      const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;
      const needsRefresh = !currentToken || !expiresAtMs || now >= (expiresAtMs - 2 * 60 * 1000);

      if (!needsRefresh) {
        return currentToken;
      }

      if (!refreshToken) {
        return currentToken;
      }

      const clientId = process.env.GHL_CLIENT_ID;
      const clientSecret = process.env.GHL_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return currentToken;
      }

      const resp = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!resp.ok) {
        return currentToken;
      }

      const tokenData = await resp.json();
      const newToken = tokenData.access_token;
      const newRefresh = tokenData.refresh_token || refreshToken;
      const newExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Update stored token
      await supabase
        .from('accounts')
        .update({
          ghl_api_key: newToken,
          ghl_refresh_token: newRefresh,
          ghl_token_expires_at: newExpiry,
        })
        .eq('id', account.id);

      return newToken;
    } catch (e) {
      return account.ghl_api_key;
    }
  }

  // Process each appointment
  for (const appt of unknownSetterAppts) {
    processed++;
    const account = appt.accounts;

    try {
      console.log(`📍 [${processed}/${unknownSetterAppts.length}] Processing appointment ${appt.id}`);

      // Get valid access token
      const accessToken = await getValidAccessToken(account);
      if (!accessToken) {
        console.error(`   ❌ No access token for account ${account.name}`);
        failed++;
        errors.push({ appointmentId: appt.id, error: 'No access token' });
        continue;
      }

      // Fetch appointment from GHL API
      const ghlResponse = await fetch(
        `https://services.leadconnectorhq.com/calendars/events/appointments/${appt.ghl_appointment_id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
          },
        }
      );

      if (!ghlResponse.ok) {
        console.error(`   ❌ GHL API error: ${ghlResponse.status}`);
        failed++;
        errors.push({ 
          appointmentId: appt.id, 
          error: `GHL API returned ${ghlResponse.status}` 
        });
        continue;
      }

      const ghlData = await ghlResponse.json();
      // GHL API returns data under 'appointment' key
      const event = ghlData.appointment || ghlData.event || ghlData;

      // Get the setter (createdBy.userId)
      const setterGhlId = event.createdBy?.userId;
      
      console.log(`   📋 GHL Response structure:`, {
        hasAppointment: !!ghlData.appointment,
        hasEvent: !!ghlData.event,
        hasCreatedBy: !!event.createdBy,
        createdByUserId: event.createdBy?.userId,
        assignedUserId: event.assignedUserId
      });
      
      if (!setterGhlId) {
        console.log(`   ⚠️  No createdBy.userId in GHL data`);
        failed++;
        errors.push({ appointmentId: appt.id, error: 'No createdBy.userId in GHL data' });
        continue;
      }

      // Fetch setter user details from GHL
      const userResponse = await fetch(
        `https://services.leadconnectorhq.com/users/${setterGhlId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
          },
        }
      );

      if (!userResponse.ok) {
        console.error(`   ❌ Failed to fetch user ${setterGhlId}`);
        failed++;
        errors.push({ appointmentId: appt.id, error: 'Failed to fetch user from GHL' });
        continue;
      }

      const userData = await userResponse.json();
      const setterName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
      const setterEmail = userData.email;

      // Try to link to existing platform user
      let linkedSetterUserId = null;
      if (setterEmail) {
        const { data: platformUser } = await supabase
          .from('users')
          .select('id')
          .eq('account_id', account.id)
          .eq('email', setterEmail)
          .single();
        
        linkedSetterUserId = platformUser?.id || null;
      }

      // Update appointment with setter info
      const updateData = {
        setter: setterName,
        updated_at: new Date().toISOString(),
      };

      if (linkedSetterUserId) {
        updateData.setter_user_id = linkedSetterUserId;
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appt.id);

      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
        failed++;
        errors.push({ appointmentId: appt.id, error: updateError.message });
      } else {
        updated++;
        console.log(`   ✅ Updated with setter: ${setterName}`);
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      failed++;
      errors.push({ 
        appointmentId: appt.id, 
        error: error.message || 'Unknown error' 
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Backfill complete!');
  console.log(`   Processed: ${processed}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\nFirst 10 errors:');
    errors.slice(0, 10).forEach(err => {
      console.log(`   ${err.appointmentId}: ${err.error}`);
    });
  }
}

main().catch(console.error);

