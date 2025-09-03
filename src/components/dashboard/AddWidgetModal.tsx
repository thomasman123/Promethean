"use client";

import React, { useState, useEffect } from 'react';
import { useDashboardStore } from '@/lib/dashboard/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedVizType(null);
      setSelectedMetric(null);
      setWidgetTitle('');
      setSearchQuery('');
      setSettings({});
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
          "rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden",
          "border border-zinc-200/50 dark:border-zinc-800/50",
          "pointer-events-auto",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}>
          {/* Modal Header */}
          <div className="px-6 py-5 border-b border-zinc-200/50 dark:border-zinc-800/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Add Widget
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
            
            {/* Progress Steps */}
            <div className="flex items-center gap-3 mt-6">
              {[
                { num: 1, label: 'Visualization' },
                { num: 2, label: 'Metric' },
                { num: 3, label: 'Configure' }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      "text-sm font-medium transition-all duration-300",
                      s.num <= step 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                    )}>
                      {s.num < step ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        s.num
                      )}
                    </div>
                    <span className={cn(
                      "hidden sm:block text-sm font-medium",
                      s.num <= step ? "text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div className={cn(
                      "flex-1 h-0.5 transition-all duration-500",
                      s.num < step ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"
                    )} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            {/* Step 1: Select Visualization */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                  Select Visualization Type
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Choose how you want to display your metric
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {vizTypes.map((viz) => (
                    <button
                      key={viz.id}
                      onClick={() => setSelectedVizType(viz.id)}
                      className={cn(
                        "group relative p-6 rounded-2xl border-2",
                        "transition-all duration-200 text-left",
                        selectedVizType === viz.id
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/10"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                        selectedVizType !== viz.id && "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <div className={cn(
                        "transition-all duration-200",
                        selectedVizType === viz.id 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"
                      )}>
                        {viz.icon}
                      </div>
                      <h4 className={cn(
                        "font-medium mt-3 mb-1",
                        selectedVizType === viz.id 
                          ? "text-blue-900 dark:text-blue-300" 
                          : "text-zinc-900 dark:text-white"
                      )}>
                        {viz.name}
                      </h4>
                      <p className={cn(
                        "text-sm",
                        selectedVizType === viz.id 
                          ? "text-blue-700/70 dark:text-blue-300/70" 
                          : "text-zinc-500 dark:text-zinc-400"
                      )}>
                        {viz.description}
                      </p>
                      {selectedVizType === viz.id && (
                        <div className="absolute top-4 right-4">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Metric */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                  Select Metric
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Choose the metric you want to track
                </p>
                
                {/* Search */}
                <div className="relative mb-6">
                  <Input
                    type="text"
                    placeholder="Search metrics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <svg 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Metrics List */}
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2 -mr-2">
                  {filteredMetrics.map((metric) => (
                    <button
                      key={metric.name}
                      onClick={() => setSelectedMetric(metric.name)}
                      className={cn(
                        "w-full p-4 rounded-xl border",
                        "text-left transition-all duration-200",
                        "flex items-start gap-4 group",
                        selectedMetric === metric.name
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                        selectedMetric !== metric.name && "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        "transition-all duration-200",
                        selectedMetric === metric.name
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
                        selectedMetric !== metric.name && "group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                      )}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "font-medium mb-1",
                          selectedMetric === metric.name
                            ? "text-blue-900 dark:text-blue-300"
                            : "text-zinc-900 dark:text-white"
                        )}>
                          {metric.displayName}
                        </h4>
                        <p className={cn(
                          "text-sm",
                          selectedMetric === metric.name
                            ? "text-blue-700/70 dark:text-blue-300/70"
                            : "text-zinc-500 dark:text-zinc-400"
                        )}>
                          {metric.description}
                        </p>
                      </div>
                      {selectedMetric === metric.name && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Configure */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                  Configure Widget
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  Customize your widget settings
                </p>

                <div className="space-y-6">
                  {/* Preview Card */}
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Preview</h4>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl">
                        {vizTypes.find(v => v.id === selectedVizType)?.icon}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {widgetTitle || metricsRegistry.find(m => m.name === selectedMetric)?.displayName}
                        </p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {vizTypes.find(v => v.id === selectedVizType)?.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Widget Title */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Custom Title (Optional)
                    </label>
                    <Input
                      type="text"
                      placeholder={metricsRegistry.find(m => m.name === selectedMetric)?.displayName}
                      value={widgetTitle}
                      onChange={(e) => setWidgetTitle(e.target.value)}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Leave empty to use the default metric name
                    </p>
                  </div>

                  {/* Additional Settings */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        More configuration options like breakdown, comparison, and filters will be available after adding the widget.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <Button
                  onClick={handleBack}
                  variant="ghost"
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={handleClose} variant="ghost">
                Cancel
              </Button>
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !selectedVizType) ||
                    (step === 2 && !selectedMetric)
                  }
                  className="gap-2"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Widget
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 