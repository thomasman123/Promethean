import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'selectedAccountId'

export function usePersistedAccount() {
  const [selectedAccountId, setSelectedAccountIdState] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize from localStorage on mount
  useEffect(() => {
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
  }, [])

  const setSelectedAccountId = useCallback((accountId: string) => {
    console.log('🔍 [usePersistedAccount] Setting account ID:', accountId)
    setSelectedAccountIdState(accountId)
    
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
  }, [])

  const clearSelectedAccount = useCallback(() => {
    console.log('🔍 [usePersistedAccount] Clearing account selection')
    setSelectedAccountIdState('')
    
    try {
      localStorage.removeItem(STORAGE_KEY)
      window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId: '' } }))
    } catch (error) {
      console.error('❌ [usePersistedAccount] Failed to clear localStorage:', error)
    }
  }, [])

  return {
    selectedAccountId,
    setSelectedAccountId,
    clearSelectedAccount,
    isInitialized
  }
} 