#!/usr/bin/env node

// Simple test script to debug Show Ups metric issue
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url_here';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_key_here';

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_') || supabaseKey.includes('your_')) {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugShowUps() {
  try {
    console.log('🔍 Debugging Show Ups metric for 7 Figure Sparky account...\n');

    // 1. Find Sparky accounts
    console.log('1. Finding Sparky accounts:');
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, is_active')
      .ilike('name', '%sparky%');

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('❌ No accounts found with "sparky" in the name');
      return;
    }

    accounts.forEach(account => {
      console.log(`   - ${account.name} (${account.id}) - Active: ${account.is_active}`);
    });

    const sparkyAccount = accounts[0]; // Use first one found
    console.log(`\n🎯 Using account: ${sparkyAccount.name} (${sparkyAccount.id})\n`);

    // 2. Check appointments for last month
    console.log('2. Checking appointments for December 2024:');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, contact_name, date_booked, call_outcome, show_outcome, local_date, created_at')
      .eq('account_id', sparkyAccount.id)
      .gte('date_booked', '2024-12-01')
      .lt('date_booked', '2025-01-01')
      .order('date_booked', { ascending: false });

    if (appointmentsError) {
      console.error('❌ Error fetching appointments:', appointmentsError);
      return;
    }

    console.log(`   Found ${appointments?.length || 0} appointments in December 2024`);
    
    if (appointments && appointments.length > 0) {
      console.log('\n3. Appointment details:');
      appointments.slice(0, 10).forEach((apt, i) => {
        console.log(`   ${i + 1}. ${apt.contact_name} - ${apt.date_booked} - call_outcome: "${apt.call_outcome}" - show_outcome: "${apt.show_outcome}"`);
      });

      // 4. Count outcomes
      console.log('\n4. Call outcome summary:');
      const outcomeCounts = {};
      appointments.forEach(apt => {
        const outcome = apt.call_outcome || 'NULL';
        outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1;
      });

      Object.entries(outcomeCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([outcome, count]) => {
          console.log(`   "${outcome}": ${count}`);
        });

      // 5. Test the exact metric query
      console.log('\n5. Testing Show Ups metric query:');
      const showExact = appointments.filter(apt => apt.call_outcome === 'Show').length;
      const showLower = appointments.filter(apt => apt.call_outcome && apt.call_outcome.toLowerCase() === 'show').length;
      const showContains = appointments.filter(apt => apt.call_outcome && apt.call_outcome.toLowerCase().includes('show')).length;

      console.log(`   Exact match "Show": ${showExact}`);
      console.log(`   Case insensitive "show": ${showLower}`);
      console.log(`   Contains "show": ${showContains}`);

      // 6. Test using local_date field (which the metric system uses)
      console.log('\n6. Testing with local_date filter (as used by metrics system):');
      const { data: localDateAppointments, error: localError } = await supabase
        .from('appointments')
        .select('id, contact_name, call_outcome, local_date')
        .eq('account_id', sparkyAccount.id)
        .gte('local_date', '2024-12-01')
        .lt('local_date', '2025-01-01')
        .eq('call_outcome', 'Show');

      if (localError) {
        console.error('❌ Error with local_date query:', localError);
      } else {
        console.log(`   Found ${localDateAppointments?.length || 0} appointments with call_outcome='Show' using local_date`);
        if (localDateAppointments && localDateAppointments.length > 0) {
          localDateAppointments.slice(0, 5).forEach(apt => {
            console.log(`     - ${apt.contact_name} (${apt.local_date})`);
          });
        }
      }
    }

    console.log('\n✅ Debug complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugShowUps(); 