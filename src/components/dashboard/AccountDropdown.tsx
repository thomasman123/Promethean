"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AccountDropdownProps {
  className?: string;
}

export function AccountDropdown({ className = '' }: AccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    getAvailableAccounts, 
    getSelectedAccount, 
    selectedAccountId, 
    setSelectedAccountId,
    user,
    loading 
  } = useAuth();

  const availableAccounts = getAvailableAccounts();
  const selectedAccount = getSelectedAccount();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    setIsOpen(false);
  };

  if (loading || !user) {
    return (
      <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded-lg h-10 w-48 ${className}`} />
    );
  }

  if (availableAccounts.length === 0) {
    return (
      <div className={`px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm text-zinc-600 dark:text-zinc-400 ${className}`}>
        No accounts available
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 transition-all min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <div className="text-left">
            <div className="font-medium">
              {selectedAccount?.name || 'Select Account'}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {selectedAccount?.description || 'No account selected'}
            </div>
          </div>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-50 max-h-60 overflow-y-auto">
          {availableAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleAccountSelect(account.id)}
              className={`w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                selectedAccountId === account.id 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                  : 'text-zinc-900 dark:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  selectedAccountId === account.id ? 'bg-blue-500' : 'bg-zinc-400'
                }`} />
                <div>
                  <div className="font-medium">{account.name}</div>
                  {account.description && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {account.description}
                    </div>
                  )}
                </div>
                {selectedAccountId === account.id && (
                  <svg className="w-4 h-4 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
          
          {/* Add Account Button */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 mt-1 pt-1">
            <button
              onClick={() => {
                // TODO: Implement add account functionality
                console.log('Add account clicked');
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span className="text-sm">Add Account</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 