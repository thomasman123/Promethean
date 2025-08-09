"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { Users, UserCheck, GitBranch, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardStore } from "@/lib/dashboard/store";
import { CompareScope, AttributionMode } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

interface CompareModeControlsProps {
  className?: string;
  reps: MultiSelectOption[];
  setters: MultiSelectOption[];
}

export function CompareModeControls({ className, reps, setters }: CompareModeControlsProps) {
  const {
    compareMode,
    compareEntities,
    compareModeSettings,
    addCompareEntity,
    removeCompareEntity,
    updateCompareModeSettings,
  } = useDashboardStore();

  if (!compareMode) return null;

  const selectedRepIds = compareEntities.filter(e => e.type === 'rep').map(e => e.id);
  const selectedSetterIds = compareEntities.filter(e => e.type === 'setter').map(e => e.id);

  const handleSetterChange = (ids: string[]) => {
    // Remove all current setters
    compareEntities
      .filter(e => e.type === 'setter')
      .forEach(e => removeCompareEntity(e.id));
    
    // Add new setters
    ids.forEach(id => {
      const setter = setters.find(s => s.value === id);
      if (setter) {
        addCompareEntity({
          id,
          type: 'setter',
          name: setter.label,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
      }
    });
  };

  const handleRepChange = (ids: string[]) => {
    // Remove all current reps
    compareEntities
      .filter(e => e.type === 'rep')
      .forEach(e => removeCompareEntity(e.id));
    
    // Add new reps
    ids.forEach(id => {
      const rep = reps.find(r => r.value === id);
      if (rep) {
        addCompareEntity({
          id,
          type: 'rep',
          name: rep.label,
          color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
      }
    });
  };

  const getPairCount = () => {
    const setterCount = selectedSetterIds.length || 1; // Include INBOUND
    const repCount = selectedRepIds.length;
    return compareModeSettings.scope === 'pair' ? setterCount * repCount : 0;
  };

  return (
    <div className={cn("space-y-4 p-4 border rounded-lg bg-muted/30", className)}>
      {/* Scope Selector */}
      <div className="flex items-center gap-4">
        <Label className="text-sm font-medium">Compare By:</Label>
        <Tabs 
          value={compareModeSettings.scope} 
          onValueChange={(v) => updateCompareModeSettings({ scope: v as CompareScope })}
        >
          <TabsList>
            <TabsTrigger value="setter" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Setters
            </TabsTrigger>
            <TabsTrigger value="rep" className="gap-2">
              <Users className="h-4 w-4" />
              Reps
            </TabsTrigger>
            <TabsTrigger value="pair" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Setter × Rep
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Entity Selectors */}
      <div className="grid grid-cols-2 gap-4">
        {(compareModeSettings.scope === 'setter' || compareModeSettings.scope === 'pair') && (
          <div className="space-y-2">
            <Label className="text-sm">Setters</Label>
            <MultiSelect
              options={setters}
              selected={selectedSetterIds}
              onChange={handleSetterChange}
              placeholder="Select setters to compare"
              className="w-full"
            />
            {compareModeSettings.scope === 'pair' && selectedSetterIds.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Note: INBOUND will be included for appointments without setters
              </p>
            )}
          </div>
        )}
        
        {(compareModeSettings.scope === 'rep' || compareModeSettings.scope === 'pair') && (
          <div className="space-y-2">
            <Label className="text-sm">Sales Reps</Label>
            <MultiSelect
              options={reps}
              selected={selectedRepIds}
              onChange={handleRepChange}
              placeholder="Select reps to compare"
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Pair Count */}
      {compareModeSettings.scope === 'pair' && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {getPairCount()} pairs selected
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  Each setter × rep combination is analyzed separately
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Attribution Mode */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Attribution Mode</Label>
        <Select
          value={compareModeSettings.attributionMode}
          onValueChange={(v) => updateCompareModeSettings({ attributionMode: v as AttributionMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">
              <div>
                <div className="font-medium">Primary (Booked-By)</div>
                <div className="text-xs text-muted-foreground">
                  Uses setter_id from appointment/discovery
                </div>
              </div>
            </SelectItem>
            <SelectItem value="last-touch">
              <div>
                <div className="font-medium">Last-Touch</div>
                <div className="text-xs text-muted-foreground">
                  Last setter interaction before booking
                </div>
              </div>
            </SelectItem>
            <SelectItem value="assist">
              <div>
                <div className="font-medium">Assist</div>
                <div className="text-xs text-muted-foreground">
                  Shows all setters who touched the contact
                </div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* De-duplication Options */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">De-duplication Options</Label>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-normal">Exclude In-Call Dials</Label>
            <p className="text-xs text-muted-foreground">
              Don't count dials that resulted in immediate discovery/appointment
            </p>
          </div>
          <Switch
            checked={compareModeSettings.excludeInCallDials}
            onCheckedChange={(checked) => 
              updateCompareModeSettings({ excludeInCallDials: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-normal">Exclude Rep Dials</Label>
            <p className="text-xs text-muted-foreground">
              Don't count dials made by reps in setter metrics
            </p>
          </div>
          <Switch
            checked={compareModeSettings.excludeRepDials}
            onCheckedChange={(checked) => 
              updateCompareModeSettings({ excludeRepDials: checked })
            }
          />
        </div>
      </div>
    </div>
  );
} 