"use client"

import * as React from "react"
import { format } from "date-fns"
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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] h-10 px-4 justify-start text-left font-normal rounded-full text-sm",
            "bg-muted/50 backdrop-blur-sm border border-border/50",
            "hover:bg-muted/80 transition-all duration-200",
            !date && "text-muted-foreground",
            className
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
      <PopoverContent className="w-auto p-0" align="end" sideOffset={5}>
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
  )
} 