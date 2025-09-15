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
    let isImpersonating = false
    
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

      if (adminProfile?.role === 'admin' || adminProfile?.role === 'moderator') {
        effectiveUserId = impersonatedUserId
        isImpersonating = true
        console.log('✅ [accounts-simple] Impersonation authorized, effective user:', effectiveUserId)
      } else {
        console.log('❌ [accounts-simple] Impersonation denied - user is not admin/moderator')
      }
    } else {
      console.log('🔍 [accounts-simple] No impersonation - using real user')
    }

    console.log('🔍 [accounts-simple] Final effective user ID:', effectiveUserId)
    console.log('🔍 [accounts-simple] Is impersonating:', isImpersonating)

    // Get effective user's profile to check role
    console.log('🔍 [accounts-simple] Getting effective user profile...')
    const { data: effectiveProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', effectiveUserId)
      .single()
    
    console.log('🔍 [accounts-simple] Effective user profile:', effectiveProfile)
    const isEffectiveAdmin = effectiveProfile?.role === 'admin' || effectiveProfile?.role === 'moderator'
    console.log('🔍 [accounts-simple] Is effective user admin/moderator?', isEffectiveAdmin)

    // Get accounts based on effective user's permissions
    let accounts: Array<{ id: string; name: string; description: string | null }> = []

    if (isEffectiveAdmin) {
      console.log('🔍 [accounts-simple] Loading all accounts (admin access)...')
      
      // Check if user has profile role 'admin' (global admin) vs just account-level admin/moderator
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', effectiveUserId)
        .single()
      
      const isGlobalAdmin = profileData?.role === 'admin'
      console.log('🔍 [accounts-simple] Is global admin?', isGlobalAdmin)
      
      if (isGlobalAdmin) {
        // Global admins see ALL accounts
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name')

      if (error) {
          console.error('❌ [accounts-simple] Global admin accounts query error:', error)
        return NextResponse.json({ accounts: [] })
      }
      
      accounts = data || []
        console.log('✅ [accounts-simple] Global admin accounts loaded:', accounts.length, 'accounts')
      } else {
        // Account-level admins/moderators only see accounts they have explicit access to
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

        if (error) {
          console.error('❌ [accounts-simple] Account-level admin query error:', error)
          return NextResponse.json({ accounts: [] })
        }
        
        accounts = (data || []).flatMap((row: any) => {
          const acc = row.accounts as any | null
          if (acc && acc.is_active) {
            return [{ id: acc.id, name: acc.name, description: acc.description }]
          }
          return []
        })
        console.log('✅ [accounts-simple] Account-level admin accounts loaded:', accounts.length, 'accounts')
      }
      console.log('🔍 [accounts-simple] Final admin accounts:', accounts.map(a => ({ id: a.id, name: a.name })))
    } else {
      console.log('🔍 [accounts-simple] Loading user-specific accounts...')
      
      // When impersonating, we need to use admin privileges to query the impersonated user's accounts
      // because RLS policies use auth.uid() which returns the admin's ID, not the impersonated user's ID
      if (isImpersonating) {
        console.log('🔍 [accounts-simple] Using admin privileges for impersonated user query...')
        
        // Create a service role client for bypassing RLS
        const serviceSupabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            cookies: {
              get() { return undefined },
              set() {},
              remove() {},
            },
          }
        )

        // Query account_access directly with service role to bypass RLS
        const { data, error } = await serviceSupabase
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

        console.log('🔍 [accounts-simple] Service role query result:', { data, error })

        if (error) {
          console.error('❌ [accounts-simple] Service role query error:', error)
          return NextResponse.json({ accounts: [] })
        }

        accounts = (data || []).flatMap((row: any) => {
          console.log('🔍 [accounts-simple] Processing service role row:', row)
          const acc = row.accounts as any | null
          if (acc && acc.is_active) {
            console.log('✅ [accounts-simple] Including account:', { id: acc.id, name: acc.name })
            return [{ id: acc.id, name: acc.name, description: acc.description }]
          }
          console.log('❌ [accounts-simple] Excluding account (inactive or null):', acc)
          return []
        })
      } else {
        // Not impersonating - use regular RLS-enabled query
        console.log('🔍 [accounts-simple] Using regular RLS query for non-impersonated user...')
        
        // First, let's check if the user has any account_access records at all
        console.log('🔍 [accounts-simple] Checking raw account_access records...')
        console.log('🔍 [accounts-simple] Query params - user_id:', effectiveUserId, 'type:', typeof effectiveUserId)
        
        // Try without is_active filter first
        const { data: allAccessData, error: allAccessError } = await supabase
          .from('account_access')
          .select('*')
          .eq('user_id', effectiveUserId)
        
        console.log('🔍 [accounts-simple] ALL account_access records (no is_active filter):', allAccessData)
        console.log('🔍 [accounts-simple] ALL account_access error:', allAccessError)
        
        const { data: rawAccessData, error: rawAccessError } = await supabase
          .from('account_access')
          .select('*')
          .eq('user_id', effectiveUserId)
          .eq('is_active', true)
        
        console.log('🔍 [accounts-simple] Raw account_access records (with is_active=true):', rawAccessData)
        console.log('🔍 [accounts-simple] Raw account_access error:', rawAccessError)
        
        // Let's also try a broad search to see if there are any records at all
        const { data: sampleData, error: sampleError } = await supabase
          .from('account_access')
          .select('user_id, account_id, is_active')
          .limit(5)
        
        console.log('🔍 [accounts-simple] Sample account_access records (any 5):', sampleData)
        console.log('🔍 [accounts-simple] Sample error:', sampleError)
        
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
      }
      
      console.log('✅ [accounts-simple] User accounts loaded:', accounts.length, 'accounts')
      console.log('🔍 [accounts-simple] User accounts:', accounts.map(a => ({ id: a.id, name: a.name })))
    }

    console.log('✅ [accounts-simple] Returning response with', accounts.length, 'accounts')
    
    const response = NextResponse.json({ accounts })
    
    // Add cache headers to reduce unnecessary requests
    // Cache for 2 minutes, but allow stale-while-revalidate for up to 5 minutes
    response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=300')
    response.headers.set('Vary', 'Cookie') // Since we use cookies for auth
    
    return response
    
  } catch (error) {
    console.error('❌ [accounts-simple] Unexpected error:', error)
    return NextResponse.json({ accounts: [] })
  }
} 