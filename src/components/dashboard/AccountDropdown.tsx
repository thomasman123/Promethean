"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

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
      <div className={cn(
        "animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-full h-10 w-48",
        className
      )} />
    );
  }

  if (availableAccounts.length === 0) {
    return (
      <div className={cn(
        "px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full",
        "text-sm text-zinc-500 dark:text-zinc-400",
        className
      )}>
        No accounts available
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2 min-w-[200px]",
          "bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm",
          "rounded-full text-sm font-medium",
          "text-zinc-900 dark:text-white",
          "hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90",
          "transition-all duration-200",
          "border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700",
          isOpen && "bg-zinc-200/90 dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700"
        )}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            "bg-emerald-500 dark:bg-emerald-400",
            "ring-2 ring-emerald-500/20 dark:ring-emerald-400/20"
          )} />
          <div className="min-w-0">
            <div className="font-medium truncate">
              {selectedAccount?.name || 'Select Account'}
            </div>
            {selectedAccount?.description && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {selectedAccount.description}
              </div>
            )}
          </div>
        </div>
        <svg 
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown Content */}
          <div className={cn(
            "absolute top-full left-0 right-0 mt-2 z-50",
            "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl",
            "rounded-2xl shadow-2xl",
            "border border-zinc-200/50 dark:border-zinc-800/50",
            "py-2",
            "max-h-[400px] overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}>
            {/* Account List */}
            <div className="px-2">
              {availableAccounts.map((account) => {
                const isSelected = selectedAccountId === account.id;
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl",
                      "text-left transition-all duration-200",
                      "flex items-center gap-3",
                      "group relative",
                      isSelected 
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" 
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                    )}
                  >
                    {/* Status Indicator */}
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      "transition-all duration-200",
                      isSelected 
                        ? "bg-blue-500 dark:bg-blue-400 ring-2 ring-blue-500/20 dark:ring-blue-400/20" 
                        : "bg-zinc-400 dark:bg-zinc-600 group-hover:bg-zinc-500 dark:group-hover:bg-zinc-500"
                    )} />
                    
                    {/* Account Info */}
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-medium truncate",
                        isSelected && "text-blue-700 dark:text-blue-300"
                      )}>
                        {account.name}
                      </div>
                      {account.description && (
                        <div className={cn(
                          "text-xs mt-0.5 truncate",
                          isSelected 
                            ? "text-blue-600/70 dark:text-blue-400/70" 
                            : "text-zinc-500 dark:text-zinc-400"
                        )}>
                          {account.description}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Checkmark */}
                    {isSelected && (
                      <svg 
                        className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Add Account Button */}
            <div className="mt-2 pt-2 px-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <button
                onClick={() => {
                  // TODO: Implement add account functionality
                  console.log('Add account clicked');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 rounded-xl",
                  "text-left transition-all duration-200",
                  "flex items-center gap-3",
                  "text-zinc-600 dark:text-zinc-400",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                  "hover:text-zinc-900 dark:hover:text-white",
                  "group"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg",
                  "bg-zinc-100 dark:bg-zinc-800",
                  "group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700",
                  "flex items-center justify-center",
                  "transition-colors duration-200"
                )}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">Add New Account</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 