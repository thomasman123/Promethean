import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Exchange the auth code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
    }

    // Get the user session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=no_user`)
    }

    // Handle invitation acceptance if this is from an email invite
    // Check if user has invitation metadata or check for pending invitations
    const userMetadata = user.user_metadata || {}
    const accountId = userMetadata.account_id
    const role = userMetadata.role || 'setter'
    const fullName = userMetadata.full_name || user.email?.split('@')[0] || ''

    try {
      // Ensure profile exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: 'setter', // Default role, will be overridden by account access
          is_active: true
        })

      if (profileError) {
        console.error('Error creating/updating profile:', profileError)
      }

      // If there's an account ID in metadata, grant access
      if (accountId) {
        const { error: accessError } = await supabase.rpc('grant_account_access', {
          p_user_id: user.id,
          p_account_id: accountId,
          p_role: role,
          p_granted_by_user_id: undefined // System grant
        })

        if (accessError) {
          console.error('Error granting account access:', accessError)
        } else {
          console.log(`✅ Granted ${role} access to account ${accountId} for user ${user.email}`)
          
          // Update any pending invitations to accepted status
          await supabase
            .from('invitations')
            .update({ 
              status: 'accepted', 
              accepted_at: new Date().toISOString() 
            })
            .eq('email', user.email!)
            .eq('account_id', accountId)
            .eq('status', 'pending')
        }
      } else {
        // Check for any pending invitations for this email
        const { data: invitations } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', user.email!)
          .eq('status', 'pending')

        // Grant access for any pending invitations
        for (const invitation of invitations || []) {
          const { error: accessError } = await supabase.rpc('grant_account_access', {
            p_user_id: user.id,
            p_account_id: invitation.account_id,
            p_role: invitation.role,
            p_granted_by_user_id: invitation.invited_by || undefined
          })

          if (!accessError) {
            // Mark invitation as accepted
            await supabase
              .from('invitations')
              .update({ 
                status: 'accepted', 
                accepted_at: new Date().toISOString() 
              })
              .eq('id', invitation.id)

            console.log(`✅ Accepted invitation for ${invitation.role} access to account ${invitation.account_id}`)
          }
        }
      }

      // Backfill any historical data
      if (accountId) {
        await supabase.rpc('link_user_to_account_and_backfill', {
          p_account_id: accountId,
          p_email: user.email!,
          p_full_name: fullName,
          p_role: role
        })
      }

    } catch (error) {
      console.error('Error handling invitation acceptance:', error)
      // Don't fail the auth flow, user can still access what they have permission for
    }
  }

  // Redirect to the next URL or dashboard
  return NextResponse.redirect(`${requestUrl.origin}${next}`)
} 