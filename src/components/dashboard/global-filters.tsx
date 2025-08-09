"use client";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Filter, ToggleLeft, ToggleRight, Users, UserCheck } from "lucide-react";
import { useDashboardStore } from "@/lib/dashboard/store";
import { DateRange } from "react-day-picker";
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
    compareEntities,
    addCompareEntity,
    removeCompareEntity,
    clearCompareEntities
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
  
  const handleCompareEntitySelect = (type: 'rep' | 'setter', ids: string[]) => {
    // Clear existing entities of this type
    compareEntities
      .filter(e => e.type === type)
      .forEach(e => removeCompareEntity(e.id));
    
    // Add new entities
    const options = type === 'rep' ? mockReps : mockSetters;
    ids.forEach(id => {
      const option = options.find(o => o.value === id);
      if (option) {
        addCompareEntity({
          id,
          type,
          name: option.label,
          color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color
        });
      }
    });
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
      
      {/* Compare Mode Entity Selection */}
      {compareMode && (
        <div className="flex items-center gap-4 pt-2 border-t">
          <span className="text-sm font-medium">Compare:</span>
          
          {/* Compare Reps */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <MultiSelect
              options={mockReps}
              selected={compareEntities.filter(e => e.type === 'rep').map(e => e.id)}
              onChange={(ids) => handleCompareEntitySelect('rep', ids)}
              placeholder="Select reps to compare"
              className="w-[220px]"
              maxItems={4}
            />
          </div>
          
          {/* Compare Setters */}
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <MultiSelect
              options={mockSetters}
              selected={compareEntities.filter(e => e.type === 'setter').map(e => e.id)}
              onChange={(ids) => handleCompareEntitySelect('setter', ids)}
              placeholder="Select setters to compare"
              className="w-[220px]"
              maxItems={4}
            />
          </div>
          
          {compareEntities.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Comparing {compareEntities.length} entities
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCompareEntities}
                  className="h-6 px-2"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
} 