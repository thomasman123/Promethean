"use client";

import { Card } from '@/components/ui/Card';

export default function DataPage() {
  return (
    <div className="min-h-screen bg-white/50 dark:bg-black/50 backdrop-blur-sm">
      {/* Content Area - Data View */}
      <div className="pl-20 pr-8 pt-20 pb-8">
        <Card>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-zinc-400 dark:text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">Data View</h2>
              <p className="text-zinc-600 dark:text-zinc-400">Data tables and analytics will be displayed here</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 