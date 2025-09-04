"use client"

import * as React from "react"
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"
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

  const presets = [
    {
      label: "Today",
      getValue: () => ({
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
      }),
    },
    {
      label: "Yesterday",
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)),
        to: endOfDay(subDays(new Date(), 1)),
      }),
    },
    {
      label: "This Week",
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      label: "Last Week",
      getValue: () => ({
        from: startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }),
        to: endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }),
      }),
    },
    {
      label: "This Month",
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: "Last Month",
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        }
      },
    },
  ]

  return (
    <div className={cn("grid gap-2", className)}>
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
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets sidebar */}
            <div className="border-r bg-muted/10">
              <div className="p-3 space-y-1">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const value = preset.getValue()
                      handleSelect({ from: value.from, to: value.to })
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm rounded-md",
                      "hover:bg-accent hover:text-accent-foreground transition-colors"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Calendar */}
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={2}
              className="p-3"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 