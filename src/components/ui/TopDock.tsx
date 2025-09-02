"use client";

import React, { useState } from 'react';

interface TopDockProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopDock({ title = "Dashboard", actions }: TopDockProps) {
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'data'>('dashboard');

  return (
    <div className="sticky top-0 z-50 px-8 py-4 bg-white">
      <div className="bg-white rounded-2xl border border-zinc-200 px-6 py-3 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          
          {/* Tab pills with icons */}
          <div className="flex items-center bg-zinc-100 rounded-full p-1">
            <button 
              onClick={() => setSelectedTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                selectedTab === 'dashboard' 
                  ? 'text-zinc-900 bg-white' 
                  : 'text-zinc-600 hover:text-zinc-700'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              Dashboard
            </button>
            <button 
              onClick={() => setSelectedTab('data')}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                selectedTab === 'data' 
                  ? 'text-zinc-900 bg-white' 
                  : 'text-zinc-600 hover:text-zinc-700'
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
              Data
            </button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
            Last 30 days
          </button>

          {/* Export button */}
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Export
          </button>

          {/* Primary CTA */}
          <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            Add Widget
          </button>

          {actions}
        </div>
      </div>
    </div>
  );
}

/* Demo/Story */
export function TopDockDemo() {
  return (
    <div className="min-h-screen bg-white">
      <TopDock 
        title="Overview"
        actions={
          <button className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
        }
      />
      <div className="px-8 py-8">
        <h2 className="text-2xl font-semibold text-zinc-900">Floating Top Dock</h2>
        <p className="mt-2 text-zinc-600">A sticky floating dock with controls and navigation</p>
      </div>
    </div>
  );
} 