#!/usr/bin/env node

/**
 * Cron script to check for overdue appointments and discoveries
 * 
 * This script should be run hourly via cron job:
 * 0 * * * * node /path/to/scripts/check-overdue-cron.js
 * 
 * Or via Vercel cron (add to vercel.json):
 * {
 *   "crons": [
 *     {
 *       "path": "/api/notifications/overdue",
 *       "schedule": "0 * * * *"
 *     }
 *   ]
 * }
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_FUNCTION_URL = process.env.SUPABASE_URL + '/functions/v1/check-overdue-notifications';

async function checkOverdueItems() {
  console.log('🔍 [cron] Starting overdue notifications check...', new Date().toISOString());

  try {
    // Call the Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'x-cron-secret': process.env.CRON_SECRET || 'default-secret'
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ [cron] Overdue check completed successfully:', data);
      
      if (data.notificationsCreated > 0) {
        console.log(`📧 [cron] Created ${data.notificationsCreated} new overdue notifications`);
      } else {
        console.log('ℹ️ [cron] No new overdue notifications needed');
      }
    } else {
      console.error('❌ [cron] Overdue check failed:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ [cron] Error during overdue check:', error);
    process.exit(1);
  }
}

// Run the check
checkOverdueItems(); 