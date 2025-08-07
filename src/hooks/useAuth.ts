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
  const [allAccounts, setAllAccounts] = useState<Accounts[]>([])

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
      try {
        console.log('Fetching profile for user:', authUser?.id || 'no id')
        console.log('Auth user details:', { 
          id: authUser?.id || 'no id', 
          email: authUser?.email || 'no email',
          hasMetadata: !!authUser?.user_metadata
        })
      } catch (logError) {
        console.log('Error in initial logging:', logError)
      }
      
      // Get user profile
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
        
      let profile = profileResult.data
      const profileError = profileResult.error

      if (profileError) {
        try {
          console.warn('Error fetching profile:', profileError)
          console.warn('Profile error details:', {
            code: profileError?.code || 'no code',
            message: profileError?.message || 'no message', 
            details: profileError?.details || 'no details',
            hint: profileError?.hint || 'no hint'
          })
        } catch (logError) {
          console.log('Error logging profile error:', logError)
        }
        
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
            try {
              console.warn('Failed to create profile:', createError)
            } catch (logError) {
              console.log('Error logging profile create error:', logError)
            }
            setUser({
              ...authUser,
              profile: null,
              accountAccess: []
            })
            setLoading(false)
            return
          } else {
            try {
              console.log('Profile created successfully:', newProfile)
            } catch (logError) {
              console.log('Error logging profile create success:', logError)
            }
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

      try {
        console.log('Profile fetched successfully:', profile)
      } catch (logError) {
        console.log('Error logging profile fetch success:', logError)
      }

      // Get user's account access
      console.log('Fetching account access for user:', authUser.id)
      let accountAccess: (AccountAccess & { account: Accounts })[] = []
      
      try {
        const { data, error: accessError } = await supabase
          .from('account_access')
          .select(`
            *,
            account:accounts(*)
          `)
          .eq('user_id', authUser.id)
          .eq('is_active', true)

        if (accessError) {
          try {
            console.warn('Error fetching account access:', accessError)
            console.warn('Account access error details:', {
              code: accessError?.code || 'no code',
              message: accessError?.message || 'no message',
              details: accessError?.details || 'no details',
              hint: accessError?.hint || 'no hint'
            })
          } catch (logError) {
            console.log('Error logging account access error:', logError)
          }
          
          // Try to create default account access if none exists  
          if (accessError.code === 'PGRST116') {
            console.log('No account access found, attempting to create default access...')
            
            const { data: newAccess, error: createAccessError } = await supabase
              .from('account_access')
              .insert({
                user_id: authUser.id,
                account_id: '01234567-0123-4567-8901-000000000001', // Default to first account
                role: 'setter',
                is_active: true
              })
              .select(`
                *,
                account:accounts(*)
              `)
              .single()
            
            if (createAccessError) {
              try {
                console.warn('Failed to create account access:', createAccessError)
              } catch (logError) {
                console.log('Error logging create access error:', logError)
              }
              accountAccess = []
            } else {
              try {
                console.log('Account access created successfully:', newAccess)
              } catch (logError) {
                console.log('Error logging account access success:', logError)
              }
              accountAccess = [newAccess]
            }
          } else {
            accountAccess = []
          }
        } else {
          try {
            console.log('Account access fetched:', data)
          } catch (logError) {
            console.log('Error logging account access fetch success:', logError)
          }
          accountAccess = data || []
        }
      } catch (accountError) {
        try {
          console.warn('Exception in account access fetch:', accountError)
        } catch (logError) {
          console.log('Error logging account exception:', logError)
        }
        accountAccess = []
      }

      const userWithProfile: UserWithProfile = {
        ...authUser,
        profile,
        accountAccess: accountAccess || []
      }

      setUser(userWithProfile)

      // For admin users, also fetch all accounts
      if (profile?.role === 'admin') {
        try {
          const { data: accounts, error: accountsError } = await supabase
            .from('accounts')
            .select('*')
            .eq('is_active', true)
            .order('name')

          if (accountsError) {
            console.warn('Error fetching all accounts for admin:', accountsError)
            setAllAccounts([])
          } else {
            console.log('🐛 DEBUG - Admin accounts fetched:', {
              count: accounts?.length || 0,
              accounts: accounts?.map(a => ({ id: a.id, name: a.name })) || []
            })
            setAllAccounts(accounts || [])
            // Set default selected account if none is set
            if (!selectedAccountId && accounts && accounts.length > 0) {
              console.log('🐛 DEBUG - Setting default selectedAccountId for admin:', accounts[0].id)
              setSelectedAccountId(accounts[0].id)
            }
          }
        } catch (error) {
          console.warn('Exception fetching all accounts:', error)
          setAllAccounts([])
        }
      } else {
        // Set default selected account if none is set for non-admin users
        if (!selectedAccountId && accountAccess && accountAccess.length > 0) {
          setSelectedAccountId(accountAccess[0].account_id)
        }
      }

    } catch (error) {
      console.warn('Error in fetchUserProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const getAvailableAccounts = () => {
    // If user is admin, they have access to all accounts
    if (user?.profile?.role === 'admin') {
      return allAccounts.map(account => ({
        id: account.id,
        name: account.name,
        description: account.description
      }))
    }
    // For non-admin users, return accounts they have specific access to
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

  const getSelectedAccount = () => {
    const accounts = getAvailableAccounts()
    return accounts.find(acc => acc.id === selectedAccountId) || accounts[0] || null
  }

  const hasAccountAccess = (): boolean => {
    // Admins have access to all accounts
    if (isAdmin()) return true
    
    // Other users need specific account access
    return !!getCurrentAccountAccess()
  }

  const getAccountBasedPermissions = () => {
    const role = getUserRole()
    const account = getSelectedAccount()
    
    return {
      canViewDashboard: true, // Everyone can see dashboard
      canViewAds: isModerator(), // Only moderators and admins
      canViewAITools: true, // Everyone can see AI tools  
      canManageAccount: isModerator(), // Only moderators and admins
      canManageTeam: isModerator(), // Only moderators and admins
      currentAccount: account,
      currentRole: role,
      isAccountSpecific: !isAdmin() // Non-admins are account-specific
    }
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
    getSelectedAccount,
    hasAccountAccess,
    getAccountBasedPermissions,
  }
} 