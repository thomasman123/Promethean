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

  const vizTypes = [
    { id: 'kpi' as VizType, name: 'KPI Tile', icon: '📊', description: 'Single metric display' },
    { id: 'bar' as VizType, name: 'Bar Chart', icon: '📊', description: 'Categorical comparisons' },
    { id: 'area' as VizType, name: 'Area Chart', icon: '📈', description: 'Trends over time' },
    { id: 'line' as VizType, name: 'Line Chart', icon: '📉', description: 'Multiple trends' }
  ];

  const filteredMetrics = metricsRegistry.filter(metric =>
    metric.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    metric.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (selectedVizType && selectedMetric) {
      addWidget({
        metricName: selectedMetric,
        breakdown: 'total',
        vizType: selectedVizType,
        position: { x: 0, y: 0 },
        size: { w: selectedVizType === 'kpi' ? 1 : 2, h: 1 },
        settings: {
          ...settings,
          title: widgetTitle || undefined
        }
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedVizType(null);
    setSelectedMetric(null);
    setWidgetTitle('');
    setSearchQuery('');
    setSettings({});
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Add Widget
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    i <= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {i}
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-0.5 transition-colors ${
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
              <div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Select Visualization Type
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {vizTypes.map((viz) => (
                    <button
                      key={viz.id}
                      onClick={() => setSelectedVizType(viz.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedVizType === viz.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-2xl mb-2">{viz.icon}</div>
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {viz.name}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {viz.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Metric */}
            {step === 2 && (
              <div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                  Select Metric
                </h3>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <Input
                    type="text"
                    placeholder="Search metrics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Metrics List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMetrics.map((metric) => (
                    <button
                      key={metric.name}
                      onClick={() => setSelectedMetric(metric.name)}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        selectedMetric === metric.name
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-medium text-zinc-900 dark:text-white">
                        {metric.displayName}
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {metric.description}
                      </div>
                      {metric.unit && (
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                          Unit: {metric.unit}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Widget Options */}
            {step === 3 && (
              <div className="space-y-6">
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
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.cumulative || false}
                        onChange={(e) => setSettings({ ...settings, cumulative: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Show as cumulative total
                      </span>
                    </label>
                  </div>
                )}

                {/* Compare vs Previous Period */}
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.compareVsPrevious || false}
                      onChange={(e) => setSettings({ ...settings, compareVsPrevious: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      Compare vs previous period
                    </span>
                  </label>
                </div>

                {/* Additional options based on visualization type */}
                {(selectedVizType === 'line' || selectedVizType === 'area') && (
                  <div>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={settings.showRollingAvg || false}
                        onChange={(e) => setSettings({ ...settings, showRollingAvg: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-zinc-100 border-zinc-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Show rolling average
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={handleBack}>
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
                  onClick={handleNext}
                  disabled={
                    (step === 1 && !selectedVizType) ||
                    (step === 2 && !selectedMetric)
                  }
                >
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  Add Widget
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 