"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/lib/dashboard/store';
import { cn } from '@/lib/utils';

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
      <div className={cn(
        "px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full",
        "text-sm text-zinc-500 dark:text-zinc-400",
        className
      )}>
        Select an account first
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2",
          "bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm",
          "rounded-full text-sm font-medium",
          "text-zinc-900 dark:text-white",
          "hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90",
          "transition-all duration-200",
          "border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700",
          isOpen && "bg-zinc-200/90 dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700"
        )}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span>{currentView?.name || 'Default View'}</span>
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
            "absolute top-full right-0 mt-2 z-50 min-w-[300px]",
            "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl",
            "rounded-2xl shadow-2xl",
            "border border-zinc-200/50 dark:border-zinc-800/50",
            "py-2",
            "max-h-[500px] overflow-y-auto",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}>
            {/* Default View */}
            <div className="px-2 pb-2">
              <button
                onClick={() => handleViewSelect('default')}
                className={cn(
                  "w-full px-3 py-2.5 rounded-xl",
                  "text-left transition-all duration-200",
                  "flex items-center gap-3",
                  "group",
                  currentView === null || currentView?.id === 'default'
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  "transition-all duration-200",
                  currentView === null || currentView?.id === 'default'
                    ? "bg-blue-200 dark:bg-blue-900/50"
                    : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                )}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium">Default View</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    System default dashboard
                  </div>
                </div>
                {(currentView === null || currentView?.id === 'default') && (
                  <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>

            {/* Personal Views */}
            {personalViews.length > 0 && (
              <>
                <div className="px-4 py-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Personal Views
                  </h3>
                </div>
                <div className="px-2 pb-2">
                  {personalViews.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => handleViewSelect(view.id)}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl mb-1",
                        "text-left transition-all duration-200",
                        "flex items-center gap-3",
                        "group",
                        currentView?.id === view.id
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        "transition-all duration-200",
                        currentView?.id === view.id
                          ? "bg-blue-200 dark:bg-blue-900/50"
                          : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                      )}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{view.name}</div>
                        {view.description && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            {view.description}
                          </div>
                        )}
                      </div>
                      {currentView?.id === view.id && (
                        <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Team Views */}
            {teamViews.length > 0 && (
              <>
                <div className="px-4 py-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Team Views
                  </h3>
                </div>
                <div className="px-2 pb-2">
                  {teamViews.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => handleViewSelect(view.id)}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl mb-1",
                        "text-left transition-all duration-200",
                        "flex items-center gap-3",
                        "group",
                        currentView?.id === view.id
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        "transition-all duration-200",
                        currentView?.id === view.id
                          ? "bg-blue-200 dark:bg-blue-900/50"
                          : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                      )}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{view.name}</div>
                        {view.description && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            {view.description}
                          </div>
                        )}
                      </div>
                      {currentView?.id === view.id && (
                        <svg className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Create View Button */}
            <div className="mt-2 pt-2 px-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <button
                onClick={handleCreateView}
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
                <span className="text-sm font-medium">Create New View</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 