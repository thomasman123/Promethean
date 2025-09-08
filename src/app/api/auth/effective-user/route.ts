import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
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

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }

    // Check for impersonation
    const impersonatedUserId = request.cookies.get('impersonate_user_id')?.value
    let effectiveUserId = session.user.id
    let isImpersonating = false

    if (impersonatedUserId) {
      // Verify the current user is an admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (adminProfile?.role === 'admin') {
        effectiveUserId = impersonatedUserId
        isImpersonating = true
      }
    }

    // Get effective user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', effectiveUserId)
      .single()

    return NextResponse.json({
      user: {
        id: effectiveUserId,
        email: profile?.email || session.user.email,
        ...profile
      },
      isImpersonating,
      realUserId: isImpersonating ? session.user.id : null
    })
  } catch (error) {
    console.error('Effective user API error:', error)
    return NextResponse.json({ error: 'Failed to get effective user' }, { status: 500 })
  }
} 