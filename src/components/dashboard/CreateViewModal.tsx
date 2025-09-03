"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStore } from '@/lib/dashboard/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ViewScope = 'private' | 'team';

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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewName('');
      setViewDescription('');
      setViewScope('private');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40",
          "animate-in fade-in-0 duration-200"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className={cn(
          "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl",
          "rounded-3xl shadow-2xl w-full max-w-md",
          "border border-zinc-200/50 dark:border-zinc-800/50",
          "pointer-events-auto",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}>
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Create New View
              </h2>
              <button
                onClick={handleClose}
                className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6">
            {/* View Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                View Name
              </label>
              <Input
                type="text"
                placeholder="e.g., Q4 Sales Dashboard"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Choose a descriptive name for your view
              </p>
            </div>

            {/* View Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                placeholder="What is this view for?"
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
                rows={3}
                className={cn(
                  "w-full px-3 py-2 rounded-xl",
                  "bg-white dark:bg-zinc-900",
                  "border border-zinc-200 dark:border-zinc-700",
                  "text-zinc-900 dark:text-white",
                  "placeholder-zinc-400 dark:placeholder-zinc-500",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                  "focus:border-transparent",
                  "transition-all duration-200",
                  "resize-none"
                )}
              />
            </div>

            {/* View Scope */}
            {canCreateTeamViews && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  View Visibility
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setViewScope('private')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-200",
                      "flex flex-col items-center gap-2 text-center",
                      viewScope === 'private'
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                      viewScope !== 'private' && "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      viewScope === 'private'
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                    <div>
                      <div className={cn(
                        "font-medium",
                        viewScope === 'private'
                          ? "text-blue-900 dark:text-blue-300"
                          : "text-zinc-900 dark:text-white"
                      )}>
                        Private
                      </div>
                      <div className={cn(
                        "text-xs mt-0.5",
                        viewScope === 'private'
                          ? "text-blue-700/70 dark:text-blue-300/70"
                          : "text-zinc-500 dark:text-zinc-400"
                      )}>
                        Only you can see
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setViewScope('team')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all duration-200",
                      "flex flex-col items-center gap-2 text-center",
                      viewScope === 'team'
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                      viewScope !== 'team' && "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      viewScope === 'team'
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    )}>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                    </div>
                    <div>
                      <div className={cn(
                        "font-medium",
                        viewScope === 'team'
                          ? "text-blue-900 dark:text-blue-300"
                          : "text-zinc-900 dark:text-white"
                      )}>
                        Team
                      </div>
                      <div className={cn(
                        "text-xs mt-0.5",
                        viewScope === 'team'
                          ? "text-blue-700/70 dark:text-blue-300/70"
                          : "text-zinc-500 dark:text-zinc-400"
                      )}>
                        All team members
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Your current filters and settings will be saved with this view. You can add widgets after creating the view.
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-end gap-3">
            <Button onClick={handleClose} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!viewName.trim() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create View
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
} 