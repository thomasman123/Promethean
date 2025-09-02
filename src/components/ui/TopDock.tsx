"use client";

import React from 'react';

interface TopDockProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopDock({ title = "Dashboard", actions }: TopDockProps) {
  return (
    <div className="sticky top-0 z-50 px-8 py-4">
      <div className="bg-white rounded-2xl shadow-soft-lg border border-zinc-100 px-6 py-3 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          
          {/* Tab pills */}
          <div className="flex items-center bg-zinc-100 rounded-full p-1">
            <button className="px-4 py-1.5 text-sm font-medium text-zinc-900 bg-white rounded-full shadow-sm">
              Dashboard
            </button>
            <button className="px-4 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors">
              Data
            </button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Last 30 days
          </button>

          {/* Export button */}
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Export
          </button>

          {/* Primary CTA */}
          <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
    <div className="min-h-screen bg-zinc-50">
      <TopDock 
        title="Overview"
        actions={
          <button className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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