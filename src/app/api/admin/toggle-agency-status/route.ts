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
    const { accountId, isAgency } = body || {}
    
    if (!accountId || typeof isAgency !== 'boolean') {
      return NextResponse.json({ 
        error: 'accountId and isAgency (boolean) are required' 
      }, { status: 400 })
    }

    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is global admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Only global admins can modify agency status' 
      }, { status: 403 })
    }

    // Call the database function to toggle agency status
    const { data, error } = await supabase.rpc(
      'toggle_account_agency_status' as any,
      {
        p_account_id: accountId,
        p_is_agency: isAgency
      }
    )

    if (error) {
      console.error('Error toggling agency status:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to update agency status' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      accountId,
      isAgency,
      message: `Account ${isAgency ? 'granted' : 'removed'} agency status`
    })
  } catch (e) {
    console.error('Agency status toggle error:', e)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 