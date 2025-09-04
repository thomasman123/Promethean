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
      return { from: startOfWeek(today), to: endOfWeek(today) }
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
      return { from: startOfMonth(today), to: endOfMonth(today) }
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
}: DatePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(
    value.from && value.to ? { from: value.from, to: value.to } : undefined
  )

  React.useEffect(() => {
    setDate(value.from && value.to ? { from: value.from, to: value.to } : undefined)
  }, [value])

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    onChange?.({
      from: newDate?.from,
      to: newDate?.to
    })
  }

  const handlePresetClick = (preset: typeof datePresets[0]) => {
    const range = preset.getValue()
    setDate(range)
    onChange?.(range)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Date preset buttons */}
      <div className="flex items-center gap-1">
        {datePresets.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            onClick={() => handlePresetClick(preset)}
            className={cn(
              "h-8 px-3 text-xs font-normal rounded-full",
              "hover:bg-muted/80 transition-all duration-200",
              date?.from && date?.to && 
              preset.getValue().from.getTime() === date.from.getTime() &&
              preset.getValue().to.getTime() === date.to.getTime() &&
              "bg-muted/80"
            )}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Date picker button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] h-10 px-4 justify-start text-left font-normal rounded-full text-sm",
              "bg-muted/50 backdrop-blur-sm border border-border/50",
              "hover:bg-muted/80 transition-all duration-200",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, y")}
                </>
              ) : (
                format(date.from, "MMM dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={5}>
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            showOutsideDays={false}
            className="rounded-lg border shadow-sm"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 