"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined color options based on shadcn theme
const COLOR_OPTIONS = [
  { name: "Chart 1", value: "hsl(var(--chart-1))", cssVar: "--chart-1" },
  { name: "Chart 2", value: "hsl(var(--chart-2))", cssVar: "--chart-2" },
  { name: "Chart 3", value: "hsl(var(--chart-3))", cssVar: "--chart-3" },
  { name: "Chart 4", value: "hsl(var(--chart-4))", cssVar: "--chart-4" },
  { name: "Chart 5", value: "hsl(var(--chart-5))", cssVar: "--chart-5" },
  { name: "Primary", value: "hsl(var(--primary))", cssVar: "--primary" },
  { name: "Secondary", value: "hsl(var(--muted-foreground))", cssVar: "--muted-foreground" },
  { name: "Destructive", value: "hsl(var(--destructive))", cssVar: "--destructive" },
  // Additional nice colors that work well in both themes
  { name: "Blue", value: "#3b82f6", cssVar: null },
  { name: "Green", value: "#10b981", cssVar: null },
  { name: "Yellow", value: "#f59e0b", cssVar: null },
  { name: "Red", value: "#ef4444", cssVar: null },
  { name: "Indigo", value: "#6366f1", cssVar: null },
  { name: "Orange", value: "#f97316", cssVar: null },
  { name: "Teal", value: "#14b8a6", cssVar: null },
  { name: "Cyan", value: "#06b6d4", cssVar: null },
];

interface ColorPickerProps {
  color?: string;
  onColorChange: (color: string) => void;
  label?: string;
}

export function ColorPicker({ color, onColorChange, label }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false);
  
  const selectedColor = COLOR_OPTIONS.find(option => option.value === color);
  
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-muted-foreground">{label}:</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-20 h-8 p-1 border border-input"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded border border-border"
                style={{
                  backgroundColor: color || "hsl(var(--chart-1))"
                }}
              />
              <span className="text-xs truncate">
                {selectedColor?.name || "Custom"}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="grid grid-cols-4 gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "relative w-12 h-12 rounded-md border-2 transition-all hover:scale-105",
                  color === option.value
                    ? "border-ring ring-2 ring-ring/20"
                    : "border-border hover:border-ring/50"
                )}
                style={{
                  backgroundColor: option.value
                }}
                onClick={() => {
                  onColorChange(option.value);
                  setOpen(false);
                }}
                title={option.name}
              >
                {color === option.value && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Click a color to select it for this metric
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
} 