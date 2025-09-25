import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'selectedAccountId'

export function usePersistedAccount() {
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Initialize client state first
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize from localStorage on mount (client-side only)
  useEffect(() => {
    if (!isClient) return
    
    try {
      const savedAccountId = localStorage.getItem(STORAGE_KEY)
      if (savedAccountId) {
        console.log('🔍 [usePersistedAccount] Loaded account from localStorage:', savedAccountId)
        setSelectedAccountIdState(savedAccountId)
      }
    } catch (error) {
      console.error('❌ [usePersistedAccount] Failed to load from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [isClient])

  const setSelectedAccountId = useCallback((accountId: string) => {
    console.log('🔍 [usePersistedAccount] Setting account ID:', accountId)
    setSelectedAccountIdState(accountId)
    
    if (!isClient) return
    
    try {
      if (accountId) {
        localStorage.setItem(STORAGE_KEY, accountId)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      
      // Trigger a custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }))
    } catch (error) {
      console.error('❌ [usePersistedAccount] Failed to save to localStorage:', error)
    }
  }, [isClient])

  const clearSelectedAccount = useCallback(() => {
    console.log('🔍 [usePersistedAccount] Clearing account selection')
    setSelectedAccountIdState('')
    
    if (!isClient) return
    
    try {
      localStorage.removeItem(STORAGE_KEY)
      window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId: '' } }))
    } catch (error) {
      console.error('❌ [usePersistedAccount] Failed to clear localStorage:', error)
    }
  }, [isClient])

  return {
    selectedAccountId,
    setSelectedAccountId,
    clearSelectedAccount,
    isInitialized: isInitialized && isClient
  }
} 