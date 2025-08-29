"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined color options with red, orange, purple, rose variants
const COLOR_OPTIONS = [
  // Red shades (row 1)
  { name: "Red 300", value: "#fca5a5", cssVar: null },
  { name: "Red 500", value: "#ef4444", cssVar: null },
  { name: "Red 600", value: "#dc2626", cssVar: null },
  { name: "Red 800", value: "#991b1b", cssVar: null },
  
  // Orange shades (row 2)
  { name: "Orange 300", value: "#fdba74", cssVar: null },
  { name: "Orange 500", value: "#f97316", cssVar: null },
  { name: "Orange 600", value: "#ea580c", cssVar: null },
  { name: "Orange 800", value: "#9a3412", cssVar: null },
  
  // Purple shades (row 3)
  { name: "Purple 300", value: "#c084fc", cssVar: null },
  { name: "Purple 500", value: "#a855f7", cssVar: null },
  { name: "Purple 600", value: "#9333ea", cssVar: null },
  { name: "Purple 800", value: "#6b21a8", cssVar: null },
  
  // Rose shades (row 4)
  { name: "Rose 300", value: "#fda4af", cssVar: null },
  { name: "Rose 500", value: "#f43f5e", cssVar: null },
  { name: "Rose 600", value: "#e11d48", cssVar: null },
  { name: "Rose 800", value: "#9f1239", cssVar: null },
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
                   backgroundColor: color || "#ef4444"
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