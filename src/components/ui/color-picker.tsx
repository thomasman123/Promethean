"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined color options with purple, pink, orange, red variants with better variance
const COLOR_OPTIONS = [
  // Purple shades (row 1) - Light to Dark
  { name: "Purple Light", value: "#e9d5ff", cssVar: null },
  { name: "Purple Medium", value: "#a855f7", cssVar: null },
  { name: "Purple Dark", value: "#7c3aed", cssVar: null },
  { name: "Purple Deep", value: "#581c87", cssVar: null },
  
  // Pink shades (row 2) - Light to Dark
  { name: "Pink Light", value: "#fbcfe8", cssVar: null },
  { name: "Pink Medium", value: "#ec4899", cssVar: null },
  { name: "Pink Dark", value: "#be185d", cssVar: null },
  { name: "Pink Deep", value: "#831843", cssVar: null },
  
  // Orange shades (row 3) - Light to Dark
  { name: "Orange Light", value: "#fed7aa", cssVar: null },
  { name: "Orange Medium", value: "#f97316", cssVar: null },
  { name: "Orange Dark", value: "#c2410c", cssVar: null },
  { name: "Orange Deep", value: "#7c2d12", cssVar: null },
  
  // Red shades (row 4) - Light to Dark
  { name: "Red Light", value: "#fecaca", cssVar: null },
  { name: "Red Medium", value: "#ef4444", cssVar: null },
  { name: "Red Dark", value: "#b91c1c", cssVar: null },
  { name: "Red Deep", value: "#7f1d1d", cssVar: null },
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
                   backgroundColor: color || "#a855f7"
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