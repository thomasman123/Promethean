import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security (allow Vercel cron jobs)
    const cronSecret = request.headers.get('x-cron-secret')
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron') || 
                        request.headers.get('x-vercel-cron') === '1'
    
    if (!isVercelCron && cronSecret !== process.env.CRON_SECRET) {
      console.error('❌ Invalid cron secret for attribution cleanup')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🧹 Starting attribution sessions cleanup...')

    // Delete expired sessions (older than 7 days)
    const { data: deletedSessions, error: deleteError } = await supabase
      .from('attribution_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id, session_id, created_at')

    if (deleteError) {
      console.error('❌ Error deleting expired sessions:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to cleanup expired sessions' 
      }, { status: 500 })
    }

    const deletedCount = deletedSessions?.length || 0
    console.log(`✅ Cleaned up ${deletedCount} expired attribution sessions`)

    // Get statistics about remaining sessions
    const { data: stats, error: statsError } = await supabase
      .from('attribution_sessions')
      .select('attribution_quality, attribution_method, contact_id')

    let statistics = {
      total_active_sessions: 0,
      linked_sessions: 0,
      unlinked_sessions: 0,
      quality_breakdown: {},
      method_breakdown: {}
    }

    if (!statsError && stats) {
      statistics.total_active_sessions = stats.length
      statistics.linked_sessions = stats.filter(s => s.contact_id).length
      statistics.unlinked_sessions = stats.filter(s => !s.contact_id).length
      
      // Quality breakdown
      statistics.quality_breakdown = stats.reduce((acc: any, session) => {
        acc[session.attribution_quality] = (acc[session.attribution_quality] || 0) + 1
        return acc
      }, {})
      
      // Method breakdown
      statistics.method_breakdown = stats.reduce((acc: any, session) => {
        acc[session.attribution_method] = (acc[session.attribution_method] || 0) + 1
        return acc
      }, {})
    }

    console.log('📊 Attribution sessions statistics:', statistics)

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired sessions`,
      deleted_count: deletedCount,
      statistics: statistics
    })

  } catch (error) {
    console.error('❌ Error in attribution cleanup:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 