"use client";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter, ToggleLeft, ToggleRight } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface GlobalFiltersProps {
  className?: string;
}

export function GlobalFilters({ className }: GlobalFiltersProps) {
  const { 
    filters, 
    setFilters, 
    clearFilters,
    compareMode,
    toggleCompareMode 
  } = useDashboardStore();
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from,
      endDate: dateRange?.to
    });
  };
  
  const activeFilterCount = Object.values(filters).filter(v => 
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className={cn("flex items-center gap-4 p-4 border-b", className)}>
      {/* Date Range Picker */}
      <DateRangePicker
        date={{
          from: filters.startDate,
          to: filters.endDate
        }}
        onDateChange={handleDateChange}
      />
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Rep Selector - Multi-select placeholder */}
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select reps" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Reps</SelectItem>
          {/* TODO: Load actual reps */}
        </SelectContent>
      </Select>
      
      {/* Setter Selector - Multi-select placeholder */}
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select setters" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Setters</SelectItem>
          {/* TODO: Load actual setters */}
        </SelectContent>
      </Select>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Compare Mode Toggle */}
      <Button
        variant={compareMode ? "default" : "outline"}
        size="sm"
        onClick={toggleCompareMode}
        className="gap-2"
      >
        {compareMode ? (
          <>
            <ToggleRight className="h-4 w-4" />
            Compare On
          </>
        ) : (
          <>
            <ToggleLeft className="h-4 w-4" />
            Compare Off
          </>
        )}
      </Button>
      
      <div className="flex-1" />
      
      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">
            {activeFilterCount} active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
} 