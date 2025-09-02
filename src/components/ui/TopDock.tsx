"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface TopDockProps {
  className?: string;
}

export function TopDock({ className = '' }: TopDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'data'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('Alex Smith');

  // Mock accounts - in real app would come from store/API
  const accounts = [
    { id: '1', name: 'Alex Smith', type: 'Personal' },
    { id: '2', name: 'Company ABC', type: 'Business' },
    { id: '3', name: 'Project XYZ', type: 'Team' }
  ];

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
    if (pathname === '/dashboard/data') return 'Data';
    if (pathname === '/account') return 'Account';
    if (pathname === '/team') return 'Team';
    if (pathname === '/subscription') return 'Subscription Plans';
    if (pathname === '/compute') return 'Buy Compute Packs';
    if (pathname === '/statistics') return 'Usage Statistics';
    if (pathname === '/billing') return 'Billing';
    if (pathname === '/promo') return 'Promo';
    if (pathname === '/settings') return 'Settings';
    return 'Dashboard'; // Default
  };

  // Update selected tab based on current path
  useEffect(() => {
    if (pathname.includes('/data')) {
      setSelectedTab('data');
    } else {
      setSelectedTab('dashboard');
    }
  }, [pathname]);

  // Check for dark mode on mount
  useEffect(() => {
    const darkMode = document.documentElement.classList.contains('dark');
    setIsDarkMode(darkMode);
  }, []);

  const handleTabChange = (tab: 'dashboard' | 'data') => {
    setSelectedTab(tab);
    // Navigate to appropriate route
    if (tab === 'dashboard') {
      router.push('/dashboard');
    } else {
      router.push('/dashboard/data');
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleAccountSelect = (accountName: string) => {
    setSelectedAccount(accountName);
    setIsAccountOpen(false);
    // In real app, would trigger account switch
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 backdrop-blur-xl bg-transparent ${className}`}>
      {/* Left section - Logo and Page Title */}
      <div className="flex items-center gap-4">
        {/* Sword Logo */}
        <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded flex items-center justify-center">
          <svg className="w-5 h-5 text-white dark:text-zinc-900" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.47 2.53a.75.75 0 010 1.06l-7.72 7.72-2.04-2.04 7.72-7.72a.75.75 0 011.06 0l.98.98zM8.71 10.29l2.04 2.04-6.37 6.37a4.5 4.5 0 01-1.85 1.14l-.59.17a.75.75 0 01-.92-.92l.17-.59a4.5 4.5 0 011.14-1.85l6.37-6.37zM21 12a.75.75 0 01-.75.75h-4.5a.75.75 0 010-1.5h4.5A.75.75 0 0121 12zm-9 6a.75.75 0 010 1.5h-4.5a.75.75 0 010-1.5H12z"/>
          </svg>
        </div>
        
        {/* Page Title */}
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center section - Account Dropdown and Navigation Pills */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4">
        {/* Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <span>{selectedAccount}</span>
            <svg className={`w-4 h-4 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isAccountOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsAccountOpen(false)} />
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden z-20">
                <div className="p-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleAccountSelect(account.name)}
                      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                        selectedAccount === account.name ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                      }`}
                    >
                      <div className="font-medium text-sm text-zinc-900 dark:text-white">{account.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{account.type}</div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm text-zinc-600 dark:text-zinc-400">
                    + Add Account
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navigation pills */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
          <button 
            onClick={() => handleTabChange('dashboard')}
            className={`p-2 rounded-full transition-all ${
              selectedTab === 'dashboard' 
                ? 'text-zinc-900 bg-white dark:text-white dark:bg-black' 
                : 'text-zinc-600 hover:text-zinc-700 dark:text-white dark:hover:text-white'
            }`}
            aria-label="Dashboard"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>
          <button 
            onClick={() => handleTabChange('data')}
            className={`p-2 rounded-full transition-all ${
              selectedTab === 'data' 
                ? 'text-zinc-900 bg-white dark:text-white dark:bg-black' 
                : 'text-zinc-600 hover:text-zinc-700 dark:text-white dark:hover:text-white'
            }`}
            aria-label="Data"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right section - User profile area */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
          {/* Support */}
          <button 
            className="p-2 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:text-white dark:hover:text-white dark:hover:bg-zinc-700 transition-all"
            aria-label="Support"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
            </svg>
          </button>

          {/* Notifications */}
          <button 
            className="p-2 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:text-white dark:hover:text-white dark:hover:bg-zinc-700 transition-all"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          </button>

          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:text-white dark:hover:text-white dark:hover:bg-zinc-700 transition-all"
            aria-label="Toggle theme"
          >
            {isDarkMode ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
            )}
          </button>

          {/* User avatar */}
          <div className="ml-1 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
        </div>
      </div>
    </div>
  );
}

/* Demo/Story */
export function TopDockDemo() {
  return (
    <div className="min-h-screen bg-white">
      <TopDock />
      <div className="px-8 py-24">
        <h2 className="text-2xl font-semibold text-zinc-900">Minimal Top Dock</h2>
        <p className="mt-2 text-zinc-600">Centered navigation pills with user profile section</p>
      </div>
    </div>
  );
} 