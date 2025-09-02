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

  // Update selected tab based on current path
  useEffect(() => {
    if (pathname.includes('/data')) {
      setSelectedTab('data');
    } else {
      setSelectedTab('dashboard');
    }
  }, [pathname]);

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
    // In a real app, you'd apply theme changes here
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 backdrop-blur-md ${className}`}>
      {/* Center navigation pills - absolute positioning for true center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center bg-zinc-100 rounded-full p-1">
          <button 
            onClick={() => handleTabChange('dashboard')}
            className={`p-2 rounded-full transition-all ${
              selectedTab === 'dashboard' 
                ? 'text-zinc-900 bg-white' 
                : 'text-zinc-600 hover:text-zinc-700'
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
                ? 'text-zinc-900 bg-white' 
                : 'text-zinc-600 hover:text-zinc-700'
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
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center bg-zinc-100 rounded-full p-1">
          {/* Support */}
          <button 
            className="p-2 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-all"
            aria-label="Support"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
            </svg>
          </button>

          {/* Notifications */}
          <button 
            className="p-2 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-all"
            aria-label="Notifications"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
          </button>

          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-all"
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