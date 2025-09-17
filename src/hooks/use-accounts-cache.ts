import { useState, useEffect, useCallback, useRef } from 'react'

interface Account {
  id: string
  name: string
  description?: string
}

interface AccountsCacheState {
  accounts: Account[]
  loading: boolean
  error: string | null
  lastFetched: number | null
}

// Global cache to persist across component unmounts
const globalAccountsCache: {
  [userId: string]: AccountsCacheState
} = {}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export function useAccountsCache(effectiveUserId?: string) {
  const [state, setState] = useState<AccountsCacheState>(() => {
    // Initialize from global cache if available
    if (effectiveUserId && globalAccountsCache[effectiveUserId]) {
      const cached = globalAccountsCache[effectiveUserId]
      const isExpired = cached.lastFetched && (Date.now() - cached.lastFetched > CACHE_DURATION)
      
      if (!isExpired) {
        console.log('🔍 [useAccountsCache] Using cached accounts for user:', effectiveUserId)
        return cached
      } else {
        console.log('🔍 [useAccountsCache] Cache expired for user:', effectiveUserId)
      }
    }
    
    return {
      accounts: [],
      loading: false,
      error: null,
      lastFetched: null
    }
  })

  const loadingRef = useRef(false)

  const loadAccounts = useCallback(async (force = false) => {
    if (!effectiveUserId) {
      console.log('🔍 [useAccountsCache] No effective user ID, skipping load')
      return
    }

    // Prevent concurrent requests
    if (loadingRef.current) {
      console.log('🔍 [useAccountsCache] Already loading, skipping duplicate request')
      return
    }

    // Check cache first (unless forced)
    if (!force && globalAccountsCache[effectiveUserId]) {
      const cached = globalAccountsCache[effectiveUserId]
      const isExpired = cached.lastFetched && (Date.now() - cached.lastFetched > CACHE_DURATION)
      
      if (!isExpired && cached.accounts.length > 0) {
        console.log('✅ [useAccountsCache] Using fresh cached accounts')
        setState(cached)
        return cached.accounts
      }
    }

    console.log('🔍 [useAccountsCache] Loading accounts from API for user:', effectiveUserId)
    loadingRef.current = true
    
    // Set loading state while preserving current state
    setState(prevState => ({
      accounts: prevState.accounts, // Keep existing accounts during loading
      loading: true,
      error: null,
      lastFetched: prevState.lastFetched
    }))

    try {
      const response = await fetch('/api/accounts-simple', {
        // Add cache control headers to prevent browser caching issues
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load accounts')
      }

      const accounts = data.accounts || []
      const successState: AccountsCacheState = {
        accounts,
        loading: false,
        error: null,
        lastFetched: Date.now()
      }
      
      console.log('✅ [useAccountsCache] Successfully loaded', accounts.length, 'accounts')
      console.log('🔍 [useAccountsCache] Account details:', accounts.map((a: Account) => ({ id: a.id, name: a.name })))
      
      setState(successState)
      globalAccountsCache[effectiveUserId] = successState
      
      return accounts
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ [useAccountsCache] Failed to load accounts:', errorMessage)
      
      setState(prevState => {
        const errorState: AccountsCacheState = {
          accounts: prevState.accounts, // Keep existing accounts on error
          loading: false,
          error: errorMessage,
          lastFetched: Date.now() // Set lastFetched even on error to prevent infinite loop
        }
        globalAccountsCache[effectiveUserId] = errorState
        return errorState
      })
      
      return []
    } finally {
      loadingRef.current = false
    }
  }, [effectiveUserId])

  const clearCache = useCallback(() => {
    if (effectiveUserId && globalAccountsCache[effectiveUserId]) {
      console.log('🔍 [useAccountsCache] Clearing cache for user:', effectiveUserId)
      delete globalAccountsCache[effectiveUserId]
      setState({
        accounts: [],
        loading: false,
        error: null,
        lastFetched: null
      })
    }
  }, [effectiveUserId])

  const refreshAccounts = useCallback(() => {
    return loadAccounts(true)
  }, [loadAccounts])

  // Auto-load accounts when user changes
  useEffect(() => {
    if (effectiveUserId && state.accounts.length === 0 && !state.loading && !state.lastFetched) {
      console.log('🔍 [useAccountsCache] Auto-loading accounts for new user:', effectiveUserId)
      loadAccounts()
    }
  }, [effectiveUserId, state.accounts.length, state.loading, state.lastFetched])

  return {
    accounts: state.accounts,
    loading: state.loading,
    error: state.error,
    loadAccounts,
    refreshAccounts,
    clearCache,
    isStale: state.lastFetched ? (Date.now() - state.lastFetched > CACHE_DURATION) : true
  }
} 