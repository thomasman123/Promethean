"use client";

import React, { useState } from 'react';

export function DashboardControls() {
  return (
    <div className="flex items-center gap-3">
      {/* Date Picker Button */}
      <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>Date Picker</span>
      </button>

      {/* Add Widget Button */}
      <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span>Add Widget</span>
      </button>

      {/* Views Button */}
      <button className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>Views</span>
      </button>
    </div>
  );
} 