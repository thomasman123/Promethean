import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  console.log('🔍 [accounts-simple] Starting API call')
  
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  try {
    console.log('🔍 [accounts-simple] Getting authenticated user...')
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ [accounts-simple] No authenticated user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ [accounts-simple] Authenticated user:', user.id)

    // Determine effective user (considering impersonation)
    const impersonatedUserId = cookieStore.get('impersonate_user_id')?.value
    let effectiveUserId = user.id
    
    console.log('🔍 [accounts-simple] Checking for impersonation...')
    console.log('🔍 [accounts-simple] impersonate_user_id cookie:', impersonatedUserId)
    
    if (impersonatedUserId) {
      console.log('🔍 [accounts-simple] Impersonation detected, verifying admin status...')
      // Verify the current user is an admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      console.log('🔍 [accounts-simple] Admin profile check:', adminProfile)

      if (adminProfile?.role === 'admin') {
        effectiveUserId = impersonatedUserId
        console.log('✅ [accounts-simple] Impersonation authorized, effective user:', effectiveUserId)
      } else {
        console.log('❌ [accounts-simple] Impersonation denied - user is not admin')
      }
    } else {
      console.log('🔍 [accounts-simple] No impersonation - using real user')
    }

    console.log('🔍 [accounts-simple] Final effective user ID:', effectiveUserId)

    // Get effective user's profile to check role
    console.log('🔍 [accounts-simple] Getting effective user profile...')
    const { data: effectiveProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', effectiveUserId)
      .single()
    
    console.log('🔍 [accounts-simple] Effective user profile:', effectiveProfile)
    const isEffectiveAdmin = effectiveProfile?.role === 'admin'
    console.log('🔍 [accounts-simple] Is effective user admin?', isEffectiveAdmin)

    // Get accounts based on effective user's permissions
    let accounts: Array<{ id: string; name: string; description: string | null }> = []

    if (isEffectiveAdmin) {
      console.log('🔍 [accounts-simple] Loading all accounts (admin access)...')
      // Effective user is admin - show all accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('❌ [accounts-simple] Admin accounts query error:', error)
        return NextResponse.json({ accounts: [] })
      }
      
      accounts = data || []
      console.log('✅ [accounts-simple] Admin accounts loaded:', accounts.length, 'accounts')
      console.log('🔍 [accounts-simple] Admin accounts:', accounts.map(a => ({ id: a.id, name: a.name })))
    } else {
      console.log('🔍 [accounts-simple] Loading user-specific accounts...')
      
      // First, let's check if the user has any account_access records at all
      console.log('🔍 [accounts-simple] Checking raw account_access records...')
      const { data: rawAccessData, error: rawAccessError } = await supabase
        .from('account_access')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)
      
      console.log('🔍 [accounts-simple] Raw account_access records:', rawAccessData)
      console.log('🔍 [accounts-simple] Raw account_access error:', rawAccessError)
      
      // Non-admin effective user - show only their accounts
      const { data, error } = await supabase
        .from('account_access')
        .select(`
          role,
          account_id,
          accounts!inner (
            id,
            name,
            description,
            is_active
          )
        `)
        .eq('user_id', effectiveUserId)
        .eq('is_active', true)

      console.log('🔍 [accounts-simple] Account access query result:', { data, error })

      if (error) {
        console.error('❌ [accounts-simple] User accounts query error:', error)
        return NextResponse.json({ accounts: [] })
      }

      console.log('🔍 [accounts-simple] Raw account_access data:', JSON.stringify(data, null, 2))

      accounts = (data || []).flatMap((row: any) => {
        console.log('🔍 [accounts-simple] Processing row:', row)
        const acc = row.accounts as any | null
        if (acc && acc.is_active) {
          console.log('✅ [accounts-simple] Including account:', { id: acc.id, name: acc.name })
          return [{ id: acc.id, name: acc.name, description: acc.description }]
        }
        console.log('❌ [accounts-simple] Excluding account (inactive or null):', acc)
        return []
      })
      
      console.log('✅ [accounts-simple] User accounts loaded:', accounts.length, 'accounts')
      console.log('🔍 [accounts-simple] User accounts:', accounts.map(a => ({ id: a.id, name: a.name })))
    }

    console.log('✅ [accounts-simple] Returning response with', accounts.length, 'accounts')
    return NextResponse.json({ accounts })
    
  } catch (error) {
    console.error('❌ [accounts-simple] Unexpected error:', error)
    return NextResponse.json({ accounts: [] })
  }
} 