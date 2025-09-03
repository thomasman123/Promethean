"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
}

interface PresetOption {
  label: string;
  getValue: () => DateRange;
  icon?: React.ReactNode;
}

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>(value || { from: null, to: null });
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update local state when value prop changes
  useEffect(() => {
    if (value) {
      setSelectedRange(value);
      setFromDate(value.from ? format(value.from, 'yyyy-MM-dd') : '');
      setToDate(value.to ? format(value.to, 'yyyy-MM-dd') : '');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const presetOptions: PresetOption[] = [
    {
      label: 'Today',
      getValue: () => ({
        from: startOfDay(new Date()),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'Yesterday',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(subDays(new Date(), 1))
      })
    },
    {
      label: 'Last 7 days',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 7)),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'Last 30 days',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 30)),
        to: endOfDay(new Date())
      })
    },
    {
      label: 'This week',
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 })
      })
    },
    {
      label: 'Last week',
      getValue: () => ({
        from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
        to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
      })
    },
    {
      label: 'This month',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
      })
    },
    {
      label: 'Last month',
      getValue: () => ({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(subMonths(new Date(), 1))
      })
    }
  ];

  const handlePresetClick = (preset: PresetOption) => {
    const range = preset.getValue();
    setSelectedRange(range);
    setFromDate(format(range.from!, 'yyyy-MM-dd'));
    setToDate(format(range.to!, 'yyyy-MM-dd'));
    onChange?.(range);
    setIsOpen(false);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromDate(value);
    if (value) {
      const fromDate = new Date(value);
      const toDate = selectedRange.to;
      
      // Ensure from date is not after to date
      if (toDate && fromDate > toDate) {
        const newRange = {
          from: fromDate,
          to: fromDate
        };
        setSelectedRange(newRange);
        setToDate(format(fromDate, 'yyyy-MM-dd'));
        onChange?.(newRange);
      } else {
        const newRange = {
          from: fromDate,
          to: toDate
        };
        setSelectedRange(newRange);
        onChange?.(newRange);
      }
    }
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToDate(value);
    if (value) {
      const fromDate = selectedRange.from;
      const toDate = new Date(value);
      
      // Ensure to date is not before from date
      if (fromDate && toDate < fromDate) {
        const newRange = {
          from: toDate,
          to: toDate
        };
        setSelectedRange(newRange);
        setFromDate(format(toDate, 'yyyy-MM-dd'));
        onChange?.(newRange);
      } else {
        const newRange = {
          from: fromDate,
          to: toDate
        };
        setSelectedRange(newRange);
        onChange?.(newRange);
      }
    }
  };

  const formatDateRange = () => {
    if (selectedRange.from && selectedRange.to) {
      const fromStr = format(selectedRange.from, 'MMM d, yyyy');
      const toStr = format(selectedRange.to, 'MMM d, yyyy');
      
      // Check if it matches a preset
      for (const preset of presetOptions) {
        const presetRange = preset.getValue();
        if (
          presetRange.from?.getTime() === selectedRange.from.getTime() &&
          presetRange.to?.getTime() === selectedRange.to.getTime()
        ) {
          return preset.label;
        }
      }
      
      return `${fromStr} - ${toStr}`;
    }
    return 'Select date range';
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-full text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90 transition-all"
      >
        <CalendarIcon className="w-4 h-4" />
        <span>{formatDateRange()}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden min-w-[500px]">
            <div className="flex h-[400px]">
              {/* Left side - Preset options */}
              <div className="w-48 bg-zinc-50/50 dark:bg-zinc-800/30 border-r border-zinc-200/50 dark:border-zinc-800/50 p-3">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3 px-3">
                  Quick Select
                </div>
                {presetOptions.map((preset) => {
                  const presetRange = preset.getValue();
                  const isActive = selectedRange.from?.getTime() === presetRange.from?.getTime() && 
                                 selectedRange.to?.getTime() === presetRange.to?.getTime();
                  
                  return (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetClick(preset)}
                      className={`w-full text-left px-3 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2 ${
                        isActive 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' 
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      {preset.icon || <CalendarIcon className="w-4 h-4 opacity-50" />}
                      <span>{preset.label}</span>
                      {isActive && (
                        <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right side - Date selectors */}
              <div className="flex-1 p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                      Custom Range
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                      Select a custom date range for your data
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Start Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={fromDate}
                          onChange={handleFromDateChange}
                          className="w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                          placeholder="Select date"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={toDate}
                          onChange={handleToDateChange}
                          className="w-full px-4 py-3 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all"
                          placeholder="Select date"
                        />
                        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Date preview */}
                  {selectedRange.from && selectedRange.to && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <CalendarIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {format(selectedRange.from, 'MMM d, yyyy')} — {format(selectedRange.to, 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {Math.ceil((selectedRange.to.getTime() - selectedRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    {(selectedRange.from || selectedRange.to) && (
                      <button
                        onClick={() => {
                          const clearedRange = { from: null, to: null };
                          setSelectedRange(clearedRange);
                          setFromDate('');
                          setToDate('');
                          onChange?.(clearedRange);
                        }}
                        className="px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 