#!/usr/bin/env node

/**
 * Fix Husham's appointments by linking them to his user profile
 * This script calls the existing backfill-appointment-users API
 */

const ACCOUNT_ID = 'f939561b-9212-421b-8aa8-eb7c5b65f40e'; // 7 Figure Sparky
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000';

async function fixHushamUserLinks() {
  console.log('🔄 Fixing Husham\'s appointment user links...');
  console.log(`📍 Account ID: ${ACCOUNT_ID}`);
  console.log(`🌐 API URL: ${API_URL}`);

  try {
    const response = await fetch(`${API_URL}/api/account/backfill-appointment-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: ACCOUNT_ID
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Successfully linked appointments to user profiles:');
    console.log(`   Appointments processed: ${result.filled?.filter(f => f.table === 'appointments').length || 0}`);
    console.log(`   Discoveries processed: ${result.filled?.filter(f => f.table === 'discoveries').length || 0}`);
    console.log(`   Dials processed: ${result.filled?.filter(f => f.table === 'dials').length || 0}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
      result.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.table} ${err.id}: ${err.reason}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error fixing user links:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixHushamUserLinks()
    .then(() => {
      console.log('\n🎉 Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    });
}

module.exports = { fixHushamUserLinks };

