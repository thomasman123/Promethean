"use client";

import { Sidebar } from '@/components/ui/Sidebar';
import { TopDock } from '@/components/ui/TopDock';
import { Card } from '@/components/ui/Card';

export default function DataPage() {
  return (
    <>
      {/* Floating Sidebar */}
      <Sidebar />
      
      {/* Top Dock */}
      <TopDock />
      
      {/* Full-width Content */}
      <div className="min-h-screen bg-white">
        {/* Content Area - Data View */}
        <div className="px-8 pt-20 pb-8">
          <Card>
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                </svg>
                <h2 className="text-2xl font-semibold text-zinc-900 mb-2">Data View</h2>
                <p className="text-zinc-600">Data tables and analytics will be displayed here</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
} 