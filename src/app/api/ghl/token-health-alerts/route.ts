import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  console.log('🔍 Checking GHL token health for alerts...')
  
  // Verify cron secret for security (allow Vercel cron jobs)
  const cronSecret = request.headers.get('x-cron-secret')
  const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') || 
                      request.headers.get('x-vercel-cron') === '1'
  
  if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
    console.error('❌ Invalid cron secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get accounts with unhealthy token status
    const { data: unhealthyAccounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        id, 
        name, 
        ghl_token_health_status, 
        ghl_token_expires_at,
        ghl_token_last_refreshed,
        account_access!inner(user_id, role, profiles!inner(email, full_name))
      `)
      .eq('ghl_auth_type', 'oauth2')
      .in('ghl_token_health_status', ['warning', 'expired', 'needs_reauth'])

    if (accountsError) {
      console.error('❌ Failed to fetch unhealthy accounts:', accountsError)
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
    }

    if (!unhealthyAccounts || unhealthyAccounts.length === 0) {
      console.log('✅ All GHL tokens are healthy')
      return NextResponse.json({ 
        success: true, 
        message: 'All tokens are healthy',
        alertsSent: 0
      })
    }

    console.log(`⚠️ Found ${unhealthyAccounts.length} accounts with unhealthy tokens`)

    const results = {
      alertsSent: 0,
      errors: 0,
      details: [] as any[]
    }

    // Process each unhealthy account
    for (const account of unhealthyAccounts) {
      try {
        // Get unique moderators and admins for this account
        const moderators = Array.from(new Set(
          account.account_access
            .filter((access: any) => ['moderator', 'admin'].includes(access.role))
            .map((access: any) => ({
              email: access.profiles.email,
              name: access.profiles.full_name,
              role: access.role
            }))
        ))

        if (moderators.length === 0) {
          console.log(`⚠️ No moderators found for account ${account.name}`)
          continue
        }

        // Create notification content based on health status
        let subject = ''
        let message = ''
        let urgency = 'medium'

        switch (account.ghl_token_health_status) {
          case 'needs_reauth':
            subject = `🚨 GHL Re-authentication Required - ${account.name}`
            message = `Your GoHighLevel connection for account "${account.name}" requires re-authentication. Please log in to your dashboard and reconnect your GHL account to resume data syncing.`
            urgency = 'high'
            break
          case 'expired':
            subject = `⚠️ GHL Token Expired - ${account.name}`
            message = `Your GoHighLevel token for account "${account.name}" has expired. The system will attempt automatic renewal, but you may need to reconnect if issues persist.`
            urgency = 'high'
            break
          case 'warning':
            subject = `⏰ GHL Token Expires Soon - ${account.name}`
            message = `Your GoHighLevel token for account "${account.name}" will expire within 7 days. The system will automatically renew it, but please monitor your connection status.`
            urgency = 'medium'
            break
        }

        // Create notifications for each moderator
        for (const moderator of moderators) {
          // Check if we already sent this alert recently (within 24 hours)
          const { data: recentAlert } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', moderator.email) // Using email as user identifier
            .eq('type', 'ghl_token_health')
            .eq('metadata->account_id', account.id)
            .eq('metadata->status', account.ghl_token_health_status)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1)

          if (recentAlert && recentAlert.length > 0) {
            console.log(`ℹ️ Skipping duplicate alert for ${moderator.email} - ${account.name}`)
            continue
          }

          // Create notification record
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: moderator.email,
              type: 'ghl_token_health',
              title: subject,
              message: message,
              urgency: urgency,
              metadata: {
                account_id: account.id,
                account_name: account.name,
                status: account.ghl_token_health_status,
                expires_at: account.ghl_token_expires_at,
                last_refreshed: account.ghl_token_last_refreshed
              },
              is_read: false
            })

          if (notificationError) {
            console.error(`❌ Failed to create notification for ${moderator.email}:`, notificationError)
            results.errors++
          } else {
            console.log(`✅ Created notification for ${moderator.email} - ${account.name}`)
            results.alertsSent++
          }
        }

        results.details.push({
          accountId: account.id,
          accountName: account.name,
          status: account.ghl_token_health_status,
          moderatorsNotified: moderators.length,
          success: true
        })

      } catch (error) {
        console.error(`❌ Error processing account ${account.id}:`, error)
        results.errors++
        results.details.push({
          accountId: account.id,
          accountName: account.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }

    // Log summary
    console.log(`🏁 Token health alerts complete:`)
    console.log(`  - Alerts sent: ${results.alertsSent}`)
    console.log(`  - Errors: ${results.errors}`)

    return NextResponse.json({
      success: true,
      message: 'Token health alerts processed',
      ...results
    })

  } catch (error) {
    console.error('❌ Token health alerts error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
} 