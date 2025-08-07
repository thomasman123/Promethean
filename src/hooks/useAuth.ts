"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Profiles, AccountAccess, Accounts, UserRole } from '@/lib/supabase'

interface UserWithProfile extends User {
  profile?: Profiles | null
  accountAccess?: (AccountAccess & { account: Accounts })[]
}

export function useAuth() {
  const [user, setUser] = useState<UserWithProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setUser(null)
        setSelectedAccountId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [selectedAccountId])

  const fetchUserProfile = async (authUser: User) => {
    try {
      console.log('Fetching profile for user:', authUser.id)
      console.log('Auth user details:', { id: authUser.id, email: authUser.email })
      
      // Get user profile
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
        
      let profile = profileResult.data
      const profileError = profileResult.error

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        console.error('Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        // If profile doesn't exist, try to create it
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, attempting to create one...')
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || '',
              role: 'setter'
            })
            .select()
            .single()
            
          if (createError) {
            console.error('Failed to create profile:', createError)
            setUser({
              ...authUser,
              profile: null,
              accountAccess: []
            })
            setLoading(false)
            return
          } else {
            console.log('Profile created successfully:', newProfile)
            profile = newProfile
          }
        } else {
          // Other error, just continue without profile
          setUser({
            ...authUser,
            profile: null,
            accountAccess: []
          })
          setLoading(false)
          return
        }
      }

      console.log('Profile fetched successfully:', profile)

      // Get user's account access
      console.log('Fetching account access for user:', authUser.id)
      const { data: accountAccess, error: accessError } = await supabase
        .from('account_access')
        .select(`
          *,
          account:accounts(*)
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true)

      if (accessError) {
        console.error('Error fetching account access:', accessError)
      } else {
        console.log('Account access fetched:', accountAccess)
      }

      const userWithProfile: UserWithProfile = {
        ...authUser,
        profile,
        accountAccess: accountAccess || []
      }

      setUser(userWithProfile)

      // Set default selected account if none is set
      if (!selectedAccountId && accountAccess && accountAccess.length > 0) {
        setSelectedAccountId(accountAccess[0].account_id)
      }

    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const getAvailableAccounts = () => {
    return user?.accountAccess?.map(access => access.account) || []
  }

  const getCurrentAccountAccess = () => {
    if (!selectedAccountId || !user?.accountAccess) return null
    return user.accountAccess.find(access => access.account_id === selectedAccountId)
  }

  const getUserRole = (): UserRole | null => {
    const currentAccess = getCurrentAccountAccess()
    return currentAccess?.role || user?.profile?.role || null
  }

  const canAccessAccount = (accountId: string): boolean => {
    return user?.accountAccess?.some(access => 
      access.account_id === accountId && access.is_active
    ) || false
  }

  const isAdmin = (): boolean => {
    return user?.profile?.role === 'admin'
  }

  const isModerator = (): boolean => {
    const role = getUserRole()
    return role === 'admin' || role === 'moderator'
  }

  return {
    user,
    loading,
    selectedAccountId,
    setSelectedAccountId,
    signOut,
    getAvailableAccounts,
    getCurrentAccountAccess,
    getUserRole,
    canAccessAccount,
    isAdmin,
    isModerator,
  }
} 