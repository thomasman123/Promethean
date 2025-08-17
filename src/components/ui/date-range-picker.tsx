"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
} from "date-fns";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const quickRanges: Array<{ label: string; get: () => DateRange }> = React.useMemo(() => [
    { label: "Today", get: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { label: "Yesterday", get: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
    { label: "This Week", get: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: "Last Week", get: () => { const d = subWeeks(new Date(), 1); return { from: startOfWeek(d), to: endOfWeek(d) }; } },
    { label: "This Month", get: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Last Month", get: () => { const d = subMonths(new Date(), 1); return { from: startOfMonth(d), to: endOfMonth(d) }; } },
  ], []);

  const handleQuickSelect = (getRange: () => DateRange) => {
    const range = getRange();
    onDateChange?.(range);
    setOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {""}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={8} collisionPadding={12} className="p-0 max-w-[95vw]">
          <div className="flex flex-col sm:flex-row">
            <div className="w-full sm:w-40 border-b sm:border-b-0 sm:border-r p-2 space-y-1">
              {quickRanges.map((q) => (
                <Button key={q.label} variant="ghost" className="w-full justify-start" onClick={() => handleQuickSelect(q.get)}>
                  {q.label}
                </Button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 