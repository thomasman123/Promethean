"use client";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter, ToggleLeft, ToggleRight } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { DateRange } from "react-day-picker";
import { CompareModeControls } from "./compare-mode-controls";
import { cn } from "@/lib/utils";

interface GlobalFiltersProps {
  className?: string;
}

// Mock data for demo - replace with actual API calls
const mockReps: MultiSelectOption[] = [
  { value: "rep1", label: "John Doe", group: "Sales Reps" },
  { value: "rep2", label: "Jane Smith", group: "Sales Reps" },
  { value: "rep3", label: "Bob Johnson", group: "Sales Reps" },
  { value: "rep4", label: "Alice Williams", group: "Sales Reps" },
];

const mockSetters: MultiSelectOption[] = [
  { value: "setter1", label: "Charlie Brown", group: "Setters" },
  { value: "setter2", label: "David Lee", group: "Setters" },
  { value: "setter3", label: "Emma Wilson", group: "Setters" },
  { value: "setter4", label: "Frank Miller", group: "Setters" },
];

export function GlobalFilters({ className }: GlobalFiltersProps) {
  const { 
    filters, 
    setFilters, 
    clearFilters,
    compareMode,
    toggleCompareMode,
    
  } = useDashboardStore();
  
  const handleDateChange = (dateRange: DateRange | undefined) => {
    setFilters({
      startDate: dateRange?.from,
      endDate: dateRange?.to
    });
  };
  
  const handleRepChange = (repIds: string[]) => {
    setFilters({ repIds });
  };
  
  const handleSetterChange = (setterIds: string[]) => {
    setFilters({ setterIds });
  };
  
  const activeFilterCount = Object.values(filters).filter(v => 
    v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  return (
    <div className={cn("flex flex-col gap-4 p-4 border-b", className)}>
      {/* Main Filter Bar */}
      <div className="flex items-center gap-4">
        {/* Date Range Picker */}
        <DateRangePicker
          date={{
            from: filters.startDate,
            to: filters.endDate
          }}
          onDateChange={handleDateChange}
        />
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Rep Selector */}
        <MultiSelect
          options={mockReps}
          selected={filters.repIds || []}
          onChange={handleRepChange}
          placeholder="Select reps"
          className="w-[200px]"
        />
        
        {/* Setter Selector */}
        <MultiSelect
          options={mockSetters}
          selected={filters.setterIds || []}
          onChange={handleSetterChange}
          placeholder="Select setters"
          className="w-[200px]"
        />
        
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
      
      {/* Compare Mode Controls */}
      {compareMode && (
        <CompareModeControls 
          reps={mockReps}
          setters={mockSetters}
          className="mt-2"
        />
      )}
    </div>
  );
} 