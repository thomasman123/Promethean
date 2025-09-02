"use client";

import React, { useState } from 'react';
import { useDashboardStore } from '@/lib/dashboard/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import type { VizType, WidgetSettings } from '@/lib/dashboard/types';

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const { metricsRegistry, addWidget } = useDashboardStore();
  const [step, setStep] = useState(1);
  const [selectedVizType, setSelectedVizType] = useState<VizType | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<WidgetSettings>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vizTypes = [
    { 
      id: 'kpi' as VizType, 
      name: 'KPI Tile', 
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      description: 'Single metric display' 
    },
    { 
      id: 'bar' as VizType, 
      name: 'Bar Chart', 
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      description: 'Categorical comparisons' 
    },
    { 
      id: 'area' as VizType, 
      name: 'Area Chart', 
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4m16 0l-4 4m4-4l-4-4M4 12l4 4m-4-4l4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l-3 3-3-3-4 4v7h18v-6l-5-5-3 3z" fill="currentColor" fillOpacity="0.1" />
        </svg>
      ),
      description: 'Trends over time' 
    },
    { 
      id: 'line' as VizType, 
      name: 'Line Chart', 
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
      description: 'Multiple trends' 
    }
  ];

  const filteredMetrics = metricsRegistry.filter(metric =>
    metric.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (selectedVizType && selectedMetric) {
      setIsSubmitting(true);
      try {
        await addWidget({
          metricName: selectedMetric,
          breakdown: 'total',
          vizType: selectedVizType,
          size: { w: selectedVizType === 'kpi' ? 3 : 6, h: selectedVizType === 'kpi' ? 2 : 4 },
          settings: {
            ...settings,
            title: widgetTitle || undefined
          }
        });
        handleClose();
      } catch (error) {
        console.error('Failed to add widget:', error);
        // Don't close modal on error so user can retry
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedVizType(null);
    setSelectedMetric(null);
    setWidgetTitle('');
    setSearchQuery('');
    setSettings({});
    setIsSubmitting(false);
    onClose();
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-300 transform">
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Add Widget
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
            
            {/* Progress Steps */}
            <div className="flex items-center gap-3 mt-6">
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <div className={`relative transition-all duration-300 ${i <= step ? 'scale-100' : 'scale-90'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      i <= step 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                    }`}>
                      {i < step ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i
                      )}
                    </div>
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-0.5 transition-all duration-500 ${
                      i < step 
                        ? 'bg-blue-600' 
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* Step 1: Select Visualization */}
            {step === 1 && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6">
                  Select Visualization Type
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {vizTypes.map((viz) => (
                    <button
                      key={viz.id}
                      onClick={() => setSelectedVizType(viz.id)}
                      className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left overflow-hidden ${
                        selectedVizType === viz.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-lg shadow-blue-600/10'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      {selectedVizType === viz.id && (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent" />
                      )}
                      <div className={`relative transition-all duration-300 ${
                        selectedVizType === viz.id ? 'text-blue-600' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                      }`}>
                        {viz.icon}
                      </div>
                      <div className="relative mt-4">
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {viz.name}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                          {viz.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Metric */}
            {step === 2 && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6">
                  Select Metric
                </h3>
                
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <Input
                      type="text"
                      placeholder="Search metrics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>

                {/* Metrics List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredMetrics.map((metric) => (
                    <button
                      key={metric.name}
                      onClick={() => setSelectedMetric(metric.name)}
                      className={`group w-full p-4 rounded-xl border transition-all duration-300 text-left ${
                        selectedMetric === metric.name
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-md shadow-blue-600/10'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-zinc-900 dark:text-white">
                            {metric.displayName}
                          </div>
                          <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {metric.description}
                          </div>
                          {metric.unit && (
                            <div className="inline-flex items-center gap-1.5 mt-2">
                              <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {metric.unit}
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedMetric === metric.name && (
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 ml-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Widget Options */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                  Widget Options
                </h3>

                {/* Widget Title */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Widget Title (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder={filteredMetrics.find(m => m.name === selectedMetric)?.displayName || 'Enter custom title...'}
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Cash Collected Option - only for cash_collected metric */}
                {selectedMetric === 'cash_collected' && (
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.cumulative || false}
                      onChange={(e) => setSettings({ ...settings, cumulative: e.target.checked })}
                      className="w-5 h-5 text-blue-600 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-0"
                    />
                    <div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Show as cumulative total
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Display running total over time
                      </p>
                    </div>
                  </label>
                )}

                {/* Compare vs Previous Period */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.compareVsPrevious || false}
                    onChange={(e) => setSettings({ ...settings, compareVsPrevious: e.target.checked })}
                    className="w-5 h-5 text-blue-600 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Compare vs previous period
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Show percentage change from last period
                    </p>
                  </div>
                </label>

                {/* Additional options based on visualization type */}
                {(selectedVizType === 'line' || selectedVizType === 'area') && (
                  <label className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showRollingAvg || false}
                      onChange={(e) => setSettings({ ...settings, showRollingAvg: e.target.checked })}
                      className="w-5 h-5 text-blue-600 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-0"
                    />
                    <div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Show rolling average
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Display 7-day moving average line
                      </p>
                    </div>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/20">
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={handleBack}>
                  <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              {step < 3 ? (
                <Button 
                  variant="primary"
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !selectedVizType) ||
                    (step === 2 && !selectedMetric)
                  }
                >
                  Next
                  <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <svg className="w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {isSubmitting ? 'Adding...' : 'Add Widget'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 