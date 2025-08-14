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
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null)
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [allAccounts, setAllAccounts] = useState<Accounts[]>([])
  const [accountChangeTimestamp, setAccountChangeTimestamp] = useState<number>(Date.now())
  const localStorageKey = (userId?: string | null) => `promethean:selectedAccountId:${userId || 'anon'}`
  const accountChangedEvent = 'promethean:selectedAccountChanged'

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
  }, []) // Remove selectedAccountId dependency to avoid re-running auth flow

  // Poll impersonation cookie on load and on account change timestamp (cheap fetch)
  useEffect(() => {
    const loadImpersonation = async () => {
      try {
        const res = await fetch('/api/auth/impersonation', { cache: 'no-store' })
        const json = await res.json()
        const impersonated = json?.impersonatedUserId || null
        setImpersonatedUserId(impersonated)
      } catch {}
    }
    loadImpersonation()
  }, [accountChangeTimestamp])

  // Effective user id
  useEffect(() => {
    setEffectiveUserId(impersonatedUserId || user?.id || null)
  }, [impersonatedUserId, user?.id])

  // Persist selected account across refreshes
  useEffect(() => {
    const userId = user?.id || null
    if (selectedAccountId) {
      try {
        window.localStorage.setItem(localStorageKey(userId), selectedAccountId)
      } catch {}
    }
  }, [selectedAccountId, user?.id])

  // Cross-component/tab synchronization for account selection
  useEffect(() => {
    const onAccountChanged = (e: Event) => {
      try {
        const custom = e as CustomEvent<string>
        const newAccountId = custom.detail
        if (newAccountId && newAccountId !== selectedAccountId) {
          // Apply without rebroadcast
          setSelectedAccountId(newAccountId)
          setAccountChangeTimestamp(Date.now())
        }
      } catch {}
    }

    const onStorage = (e: StorageEvent) => {
      if (!user?.id) return
      if (e.key === localStorageKey(user.id) && e.newValue && e.newValue !== selectedAccountId) {
        setSelectedAccountId(e.newValue)
        setAccountChangeTimestamp(Date.now())
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(accountChangedEvent, onAccountChanged as EventListener)
      window.addEventListener('storage', onStorage)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(accountChangedEvent, onAccountChanged as EventListener)
        window.removeEventListener('storage', onStorage)
      }
    }
  }, [selectedAccountId, user?.id])

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

      // Get user's account access
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
          // Try to create default account access if none exists  
          if (accessError.code === 'PGRST116') {
            const { data: newAccess } = await supabase
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
            accountAccess = newAccess ? [newAccess] : []
          } else {
            accountAccess = []
          }
        } else {
          accountAccess = data || []
        }
      } catch (accountError) {
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
          const { data: accounts } = await supabase
            .from('accounts')
            .select('*')
            .eq('is_active', true)
            .order('name')
          setAllAccounts(accounts || [])
          // Restore persisted selection if available and accessible
          if (!selectedAccountId && accounts && accounts.length > 0) {
            let restored: string | null = null
            try {
              restored = window.localStorage.getItem(localStorageKey(authUser.id))
            } catch {}
            const isValid = restored && accounts.some(a => a.id === restored)
            if (isValid && restored) {
              setSelectedAccountId(restored)
            } else {
              setSelectedAccountId(accounts[0].id)
            }
          }
        } catch (error) {
          setAllAccounts([])
        }
      } else {
        // Set default selected account if none is set for non-admin users
        if (!selectedAccountId && accountAccess && accountAccess.length > 0) {
          let restored: string | null = null
          try {
            restored = window.localStorage.getItem(localStorageKey(authUser.id))
          } catch {}
          const isValid = restored && accountAccess.some(a => a.account_id === restored)
          if (isValid && restored) {
            setSelectedAccountId(restored)
          } else {
            setSelectedAccountId(accountAccess[0].account_id)
          }
        }
      }

    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const getAvailableAccounts = () => {
    if (user?.profile?.role === 'admin') {
      return allAccounts.map(account => ({
        id: account.id,
        name: account.name,
        description: account.description
      }))
    }
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
    if (isAdmin()) return true
    return !!getCurrentAccountAccess()
  }

  const getAccountBasedPermissions = () => {
    const role = getUserRole()
    const account = getSelectedAccount()
    
    return {
      canViewDashboard: true,
      canViewAds: isModerator(),
      canViewAITools: true, 
      canManageAccount: isModerator(),
      canManageTeam: isModerator(),
      currentAccount: account,
      currentRole: role,
      isAccountSpecific: !isAdmin()
    }
  }

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    setAccountChangeTimestamp(Date.now())
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(accountChangedEvent, { detail: accountId }))
      }
    } catch {}
  }

  const startImpersonation = async (targetUserId: string) => {
    await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId })
    })
    setAccountChangeTimestamp(Date.now())
  }

  const stopImpersonation = async () => {
    await fetch('/api/admin/impersonate', { method: 'DELETE' })
    setAccountChangeTimestamp(Date.now())
  }

  return {
    user,
    effectiveUserId,
    impersonatedUserId,
    loading,
    selectedAccountId,
    setSelectedAccountId: handleAccountChange,
    signOut,
    startImpersonation,
    stopImpersonation,
    getAvailableAccounts,
    getCurrentAccountAccess,
    getUserRole,
    canAccessAccount,
    isAdmin,
    isModerator,
    getSelectedAccount,
    hasAccountAccess,
    getAccountBasedPermissions,
    accountChangeTimestamp,
  }
} 