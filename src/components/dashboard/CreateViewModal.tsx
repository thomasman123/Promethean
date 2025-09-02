"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/lib/dashboard/store';
import type { ViewScope } from '@/lib/dashboard/types';

interface CreateViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateViewModal({ isOpen, onClose }: CreateViewModalProps) {
  const [viewName, setViewName] = useState('');
  const [viewDescription, setViewDescription] = useState('');
  const [viewScope, setViewScope] = useState<ViewScope>('private');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getUserRole, user } = useAuth();
  const { createView, selectedAccountId, filters } = useDashboardStore();

  const userRole = getUserRole();
  const canCreateTeamViews = userRole === 'admin' || userRole === 'moderator';

  const handleSubmit = async () => {
    if (!viewName.trim() || !selectedAccountId || !user) return;

    setIsSubmitting(true);
    try {
      // Create the view with empty widgets and current filters
      await createView({
        name: viewName.trim(),
        description: viewDescription.trim() || undefined,
        accountId: selectedAccountId,
        createdBy: user.id,
        scope: viewScope,
        isPrivate: viewScope === 'private',
        filters: filters,
        compareMode: false,
        compareEntities: []
      });

      handleClose();
    } catch (error) {
      console.error('Error creating view:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setViewName('');
    setViewDescription('');
    setViewScope('private');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-300 transform">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Create View
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">
            {/* View Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                View Name *
              </label>
              <Input
                type="text"
                placeholder="Enter view name..."
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                className="w-full"
                maxLength={100}
              />
            </div>

            {/* View Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                placeholder="Describe this view..."
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {viewDescription.length}/500 characters
              </div>
            </div>

            {/* Privacy Options */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Privacy Settings
              </label>
              <div className="space-y-3">
                {/* Private View */}
                <label className="flex items-start gap-3 p-4 rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all cursor-pointer">
                  <input
                    type="radio"
                    name="viewScope"
                    value="private"
                    checked={viewScope === 'private'}
                    onChange={(e) => setViewScope(e.target.value as ViewScope)}
                    className="mt-0.5 w-4 h-4 text-blue-600 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                      </svg>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Private View
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Only visible to you
                    </p>
                  </div>
                </label>

                {/* Team View */}
                <label className={`flex items-start gap-3 p-4 rounded-xl transition-all cursor-pointer ${
                  canCreateTeamViews 
                    ? 'bg-zinc-100/50 dark:bg-zinc-800/50 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50' 
                    : 'bg-zinc-100/50 dark:bg-zinc-800/25 cursor-not-allowed opacity-60'
                }`}>
                  <input
                    type="radio"
                    name="viewScope"
                    value="team"
                    checked={viewScope === 'team'}
                    onChange={(e) => setViewScope(e.target.value as ViewScope)}
                    disabled={!canCreateTeamViews}
                    className="mt-0.5 w-4 h-4 text-blue-600 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-0 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        Team View
                      </span>
                      {!canCreateTeamViews && (
                        <span className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-full">
                          Admin Only
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Visible to all team members in this account
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Current State Info */}
            <div className="bg-zinc-100/50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-zinc-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    New view will start empty
                  </h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    Add widgets after creating the view
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-end">
            <div className="flex items-center gap-3">
              <button 
                onClick={handleClose} 
                disabled={isSubmitting}
                className="px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 rounded-full font-medium text-sm backdrop-blur-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!viewName.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-full font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create View
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 