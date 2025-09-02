"use client";

import React, { useState } from 'react';

interface View {
  id: string;
  name: string;
  isDefault?: boolean;
}

interface TopBarProps {
  mode: 'dashboard' | 'data';
  onModeChange: (mode: 'dashboard' | 'data') => void;
}

export default function TopBar({ mode, onModeChange }: TopBarProps) {
  const [selectedView, setSelectedView] = useState<View>({ id: '1', name: 'Default View', isDefault: true });
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [dateRange, setDateRange] = useState('Last 30 days');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [dataTableType, setDataTableType] = useState<'setters' | 'closers'>('setters');

  // Mock data
  const views: View[] = [
    { id: '1', name: 'Default View', isDefault: true },
    { id: '2', name: 'Sales Overview' },
    { id: '3', name: 'Performance Metrics' },
    { id: '4', name: 'Q4 Analysis' },
  ];

  const dateRanges = [
    'Today',
    'Yesterday',
    'Last 7 days',
    'Last 30 days',
    'Last 90 days',
    'This month',
    'Last month',
    'Custom range'
  ];

  return (
    <div className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mode Selector */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onModeChange('dashboard')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'dashboard' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onModeChange('data')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'data' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Data Table
          </button>
        </div>

        {/* Data Table Type Selector (only in data mode) */}
        {mode === 'data' && (
          <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
            <label className="text-sm text-gray-500">View:</label>
            <select
              value={dataTableType}
              onChange={(e) => setDataTableType(e.target.value as 'setters' | 'closers')}
              className="text-sm font-medium text-gray-900 bg-transparent border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="setters">Setters</option>
              <option value="closers">Closers</option>
            </select>
          </div>
        )}

        {/* Views Dropdown (only in dashboard mode) */}
        {mode === 'dashboard' && (
          <div className="relative">
            <button
              onClick={() => setViewDropdownOpen(!viewDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>{selectedView.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {viewDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1">
                    Saved Views
                  </div>
                  {views.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => {
                        setSelectedView(view);
                        setViewDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-gray-100 transition-colors duration-150 ${
                        selectedView.id === view.id ? 'bg-gray-100' : ''
                      }`}
                    >
                      <span className="text-gray-900">{view.name}</span>
                      {view.isDefault && (
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">Default</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-200 p-2">
                  <button className="w-full flex items-center space-x-2 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create New View</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-3">
        {/* Date Range Selector */}
        <div className="relative">
          <button
            onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{dateRange}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dateDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-1">
                {dateRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      setDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors duration-150 ${
                      dateRange === range ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compare Button (only in data mode) */}
        {mode === 'data' && (
          <button className="flex items-center space-x-2 px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Compare</span>
          </button>
        )}

        {/* Add Widget Button (only in dashboard mode) */}
        {mode === 'dashboard' && (
          <button className="flex items-center space-x-2 px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Widget</span>
          </button>
        )}

        {/* Export Button */}
        <button className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span>Export</span>
        </button>

        {/* Settings Button */}
        <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
} 