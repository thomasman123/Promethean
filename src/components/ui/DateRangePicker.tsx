"use client";

import React, { useState, useRef, useEffect } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';

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
        {/* Calendar Icon */}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
        </svg>
        <span>{formatDateRange()}</span>
        {/* Chevron Down Icon */}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden min-w-[400px]">
          <div className="flex">
            {/* Left side - Preset options */}
            <div className="w-40 border-r border-zinc-200 dark:border-zinc-800 p-2">
              {presetOptions.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Right side - Date selectors */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={handleFromDateChange}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={handleToDateChange}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              {/* Clear button */}
              {(selectedRange.from || selectedRange.to) && (
                <button
                  onClick={() => {
                    const clearedRange = { from: null, to: null };
                    setSelectedRange(clearedRange);
                    setFromDate('');
                    setToDate('');
                    onChange?.(clearedRange);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 