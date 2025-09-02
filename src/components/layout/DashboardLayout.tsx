"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/navigation/Sidebar';
import TopBar from '@/components/navigation/TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mode, setMode] = useState<'dashboard' | 'data'>('dashboard');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area - Add margin-left for collapsed sidebar */}
      <div className="flex-1 flex flex-col overflow-hidden ml-16">
        {/* Top Bar */}
        <TopBar mode={mode} onModeChange={setMode} />
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
} 