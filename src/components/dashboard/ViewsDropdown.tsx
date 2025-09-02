"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/lib/dashboard/store';

interface ViewsDropdownProps {
  className?: string;
  onCreateView: () => void;
}

export function ViewsDropdown({ className = '', onCreateView }: ViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedAccountId, getUserRole, user } = useAuth();
  const { currentView, setCurrentView, getViewsForAccount, selectedAccountId: storeAccountId, views } = useDashboardStore();

  // Use the account ID from the store
  const accountId = storeAccountId || selectedAccountId;
  
  // Get views for current account
  const accountViews = getViewsForAccount(accountId || '');
  const personalViews = accountViews.filter(view => view.isPrivate && view.createdBy === user?.id);
  const teamViews = accountViews.filter(view => !view.isPrivate);

  const userRole = getUserRole();
  const canCreateTeamViews = userRole === 'admin' || userRole === 'moderator';

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

  const handleViewSelect = (viewId: string) => {
    const view = views.find(v => v.id === viewId);
    if (view) {
      setCurrentView(view);
    }
    setIsOpen(false);
  };

  const handleCreateView = () => {
    onCreateView();
    setIsOpen(false);
  };

  if (!selectedAccountId) {
    return (
      <button 
        disabled
        className={`flex items-center gap-2 px-4 py-2 bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-500 dark:text-zinc-500 cursor-not-allowed ${className}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
        </svg>
        <span>Views</span>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 transition-all"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
        </svg>
        <span>{currentView?.name || 'Default View'}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 min-w-[250px] bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl py-2 z-50 max-h-80 overflow-y-auto">
          
          {/* Default View */}
          <button
            onClick={() => {
              setCurrentView(null);
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2 text-left hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all ${
              !currentView ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span className="font-medium">Default View</span>
              {!currentView && (
                <svg className="w-4 h-4 ml-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>

          {/* Personal Views */}
          {personalViews.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2">
                Personal Views
              </div>
              {personalViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewSelect(view.id)}
                  className={`w-full px-4 py-2 text-left hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all ${
                    currentView?.id === view.id 
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'text-zinc-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">{view.name}</div>
                      {view.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{view.description}</div>
                      )}
                    </div>
                    {currentView?.id === view.id && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Team Views */}
          {teamViews.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2">
                Team Views
              </div>
              {teamViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewSelect(view.id)}
                  className={`w-full px-4 py-2 text-left hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all ${
                    currentView?.id === view.id 
                      ? 'bg-blue-100/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : 'text-zinc-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    <div className="flex-1">
                      <div className="font-medium">{view.name}</div>
                      {view.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{view.description}</div>
                      )}
                    </div>
                    {currentView?.id === view.id && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Create View Button */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2">
            <button
              onClick={handleCreateView}
              className="w-full px-4 py-2 text-left text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span className="text-sm font-medium">Create View</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 