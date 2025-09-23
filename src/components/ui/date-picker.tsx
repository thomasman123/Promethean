"use client"

import * as React from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: {
    from: Date | undefined
    to: Date | undefined
  }
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void
  className?: string
  applyMode?: boolean
}

function clampToTodayRange(range: { from?: Date | undefined; to?: Date | undefined } | undefined): { from?: Date; to?: Date } | undefined {
  if (!range) return undefined
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const clampedTo = range.to && range.to > today ? today : range.to
  const clampedFrom = range.from && range.from > today ? today : range.from
  // Ensure from is not after to
  if (clampedFrom && clampedTo && clampedFrom > clampedTo) {
    return { from: clampedTo, to: clampedTo }
  }
  return { from: clampedFrom, to: clampedTo }
}

const datePresets = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return { from: today, to: today }
    }
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      yesterday.setHours(0, 0, 0, 0)
      return { from: yesterday, to: yesterday }
    }
  },
  {
    label: "This Week",
    getValue: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return { from: startOfWeek(today), to: today }
    }
  },
  {
    label: "Last Week",
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
    }
  },
  {
    label: "This Month",
    getValue: () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return { from: startOfMonth(today), to: today }
    }
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
  }
]

export function DatePicker({
  value = { from: undefined, to: undefined },
  onChange,
  className,
  applyMode = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<DateRange | undefined>(
    value.from && value.to ? { from: value.from, to: value.to } : undefined
  )

  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  React.useEffect(() => {
    setDate(value.from && value.to ? { from: value.from, to: value.to } : undefined)
  }, [value])

  const handleSelect = (newDate: DateRange | undefined) => {
    const clamped = clampToTodayRange(newDate)
    setDate(clamped as DateRange | undefined)
    if (!applyMode) {
      onChange?.({
        from: clamped?.from,
        to: clamped?.to
      })
    }
  }

  const handlePresetClick = (preset: typeof datePresets[0]) => {
    const range = preset.getValue()
    const clamped = clampToTodayRange(range) as { from?: Date; to?: Date }
    setDate(clamped as DateRange | undefined)
    if (!applyMode) {
      onChange?.({ from: clamped.from, to: clamped.to })
    }
  }

  const handleApply = () => {
    if (applyMode) {
      const clamped = clampToTodayRange(date)
      onChange?.({ from: clamped?.from, to: clamped?.to })
      setOpen(false)
    }
  }

  const displayRange = applyMode
    ? (value.from && value.to ? { from: value.from, to: value.to } : undefined)
    : date

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (next) {
        // Reset pending selection to last applied when opening
        setDate(value.from && value.to ? { from: value.from, to: value.to } : undefined)
      }
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 justify-start text-left font-normal",
            !displayRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {displayRange?.from ? (
            displayRange.to ? (
              <>
                {format(displayRange.from, "MMM dd")} - {format(displayRange.to, "MMM dd, y")}
              </>
            ) : (
              format(displayRange.from, "MMM dd, y")
            )
          ) : (
            <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={5}>
        <div className="flex">
          {/* Date preset buttons - vertical layout on the left */}
          <div className="flex flex-col gap-1 p-3 border-r">
            {datePresets.map((preset) => {
              const presetRange = preset.getValue()
              const isActive = date?.from && date?.to && 
                presetRange.from.getTime() === date.from.getTime() &&
                presetRange.to.getTime() === date.to.getTime()
              
              return (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "h-8 px-3 text-xs font-normal justify-start whitespace-nowrap",
                    "hover:bg-muted transition-all duration-200",
                    isActive && "bg-muted"
                  )}
                >
                  {preset.label}
                </Button>
              )
            })}
          </div>

          {/* Calendar */}
          <Calendar
            mode="range"
            defaultMonth={date?.from && date.from <= today ? date.from : today}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            showOutsideDays={false}
            className="rounded-lg border-0"
            toDate={today}
            disabled={[{ after: today }]}
          />
        </div>
        {applyMode && (
          <div className="flex justify-end gap-2 p-2 border-t">
            <Button variant="default" size="sm" className="h-8" onClick={handleApply}>
              Apply
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
} 