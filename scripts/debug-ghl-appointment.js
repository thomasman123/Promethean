#!/usr/bin/env node

/**
 * Debug script to see what GHL API returns for an appointment
 * This will help us understand the structure and find where the setter/creator info is
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const appointmentId = process.argv[2];
  
  if (!appointmentId) {
    console.error('Usage: node scripts/debug-ghl-appointment.js <appointment_id>');
    console.error('Example: node scripts/debug-ghl-appointment.js 374971af-2641-4f0b-a05a-adda09659495');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Get the appointment from our database
  const { data: appt, error: fetchError } = await supabase
    .from('appointments')
    .select(`
      id,
      ghl_appointment_id,
      setter,
      date_booked,
      accounts!inner (
        id,
        name,
        ghl_api_key,
        ghl_refresh_token,
        ghl_token_expires_at,
        ghl_auth_type
      )
    `)
    .eq('id', appointmentId)
    .single();

  if (fetchError || !appt) {
    console.error('❌ Appointment not found:', fetchError);
    process.exit(1);
  }

  console.log('📍 Appointment in our database:');
  console.log(JSON.stringify({
    id: appt.id,
    ghl_appointment_id: appt.ghl_appointment_id,
    setter: appt.setter,
    date_booked: appt.date_booked,
    account: appt.accounts.name
  }, null, 2));

  const account = appt.accounts;
  const accessToken = account.ghl_api_key;

  if (!accessToken) {
    console.error('❌ No access token for account');
    process.exit(1);
  }

  console.log('\n🔍 Fetching from GHL API...\n');

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
    console.error(`❌ GHL API error: ${ghlResponse.status}`);
    const errorText = await ghlResponse.text();
    console.error('Error response:', errorText);
    process.exit(1);
  }

  const ghlData = await ghlResponse.json();
  
  console.log('📦 Full GHL API Response:');
  console.log(JSON.stringify(ghlData, null, 2));

  // Try to extract potential setter fields
  const event = ghlData.event || ghlData;
  
  console.log('\n🔍 Potential setter fields:');
  console.log('- createdBy:', event.createdBy);
  console.log('- userId:', event.userId);
  console.log('- assignedUserId:', event.assignedUserId);
  console.log('- calendarId:', event.calendarId);
  console.log('- appoinmentStatus:', event.appoinmentStatus);
  
  // Check if there's an assigned user we can use
  if (event.assignedUserId) {
    console.log('\n✅ Found assignedUserId, fetching user details...');
    
    const userResponse = await fetch(
      `https://services.leadconnectorhq.com/users/${event.assignedUserId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Version': '2021-07-28',
        },
      }
    );
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('\n👤 Assigned User Details:');
      console.log(JSON.stringify(userData, null, 2));
    } else {
      console.log('⚠️ Could not fetch assigned user');
    }
  }
}

main().catch(console.error);

