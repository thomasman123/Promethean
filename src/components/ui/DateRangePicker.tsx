"use client";

import * as React from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: {
    from: Date | null;
    to: Date | null;
  };
  onChange?: (range: { from: Date | null; to: Date | null }) => void;
  className?: string;
}

interface PresetOption {
  label: string;
  getValue: () => { from: Date; to: Date };
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (value?.from && value?.to) {
      return { from: value.from, to: value.to };
    }
    return undefined;
  });

  React.useEffect(() => {
    if (value?.from && value?.to) {
      setDate({ from: value.from, to: value.to });
    } else {
      setDate(undefined);
    }
  }, [value]);

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (onChange) {
      onChange({
        from: newDate?.from || null,
        to: newDate?.to || null
      });
    }
  };

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
    handleSelect(range);
  };

  const formatDateRange = () => {
    if (date?.from) {
      if (date.to) {
        // Check if it matches a preset
        for (const preset of presetOptions) {
          const presetRange = preset.getValue();
          if (
            presetRange.from.getTime() === date.from.getTime() &&
            presetRange.to.getTime() === date.to.getTime()
          ) {
            return preset.label;
          }
        }
        return `${format(date.from, 'MMM d, yyyy')} - ${format(date.to, 'MMM d, yyyy')}`;
      }
      return format(date.from, 'MMM d, yyyy');
    }
    return 'Select date range';
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal rounded-full",
              "bg-zinc-100/90 dark:bg-zinc-900/90",
              "hover:bg-zinc-200/90 dark:hover:bg-zinc-800/90",
              "border-0",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {/* Preset options */}
            <div className="w-48 border-r p-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Quick Select
              </div>
              {presetOptions.map((preset) => {
                const presetRange = preset.getValue();
                const isActive = date?.from?.getTime() === presetRange.from.getTime() && 
                               date?.to?.getTime() === presetRange.to.getTime();
                
                return (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm rounded-md transition-all",
                      "flex items-center gap-2",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <CalendarIcon className="w-3 h-3 opacity-50" />
                    <span>{preset.label}</span>
                    {isActive && (
                      <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
              
              {/* Clear button */}
              {date && (
                <button
                  onClick={() => handleSelect(undefined)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-md transition-all mt-2",
                    "flex items-center gap-2 text-destructive hover:bg-destructive/10"
                  )}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              )}
            </div>
            
            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 