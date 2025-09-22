import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 })
    }

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is global admin or moderator on this account
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isGlobalAdmin = profile?.role === 'admin'
    
    if (!isGlobalAdmin) {
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', user.id)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .single()

      if (!access || access.role !== 'moderator') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    console.log('🔄 Disconnecting Meta Ads for account:', accountId)

    // Clear Meta Ads connection data from the account
    const { error: updateError } = await supabase
      .from('accounts')
      .update({
        meta_access_token: null,
        meta_user_id: null,
        meta_auth_type: null,
        meta_token_expires_at: null,
        meta_token_health_status: null,
        meta_token_last_refreshed: null,
      })
      .eq('id', accountId)

    if (updateError) {
      console.error('❌ Failed to disconnect Meta Ads:', updateError)
      return NextResponse.json({ error: 'Failed to disconnect Meta Ads' }, { status: 500 })
    }

    console.log('✅ Meta Ads disconnected successfully for account:', accountId)

    return NextResponse.json({ 
      success: true, 
      message: 'Meta Ads connection removed successfully' 
    })

  } catch (error) {
    console.error('Error disconnecting Meta Ads:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 