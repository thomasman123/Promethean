"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Clock, Globe, MoreHorizontal, Check, ChevronsUpDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BusinessHourMapping } from "@/lib/dashboard/types";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// Common timezones grouped by region
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'North America' },
  { value: 'Europe/London', label: 'Greenwich Time (London)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Central European Time (Rome)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Central European Time (Madrid)', region: 'Europe' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Asia Pacific' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)', region: 'Asia Pacific' },
  { value: 'Australia/Perth', label: 'Australian Western Time (Perth)', region: 'Asia Pacific' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia Pacific' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)', region: 'Asia Pacific' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Kolkata)', region: 'Asia Pacific' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)', region: 'South America' },
];

// Time options for business hours (24-hour format)
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

interface CountryCode {
  countryCode: string;
  count: number;
  name: string;
  flag: string;
  defaultTz: string;
}

interface BusinessHourEditorProps {
  value: BusinessHourMapping[];
  onChange: (mappings: BusinessHourMapping[]) => void;
}

export function BusinessHourEditor({ value, onChange }: BusinessHourEditorProps) {
  const { selectedAccountId } = useAuth();
  const [countryCodes, setCountryCodes] = useState<CountryCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch country codes from the API
  useEffect(() => {
    if (!selectedAccountId) return;

    const fetchCountryCodes = async () => {
      try {
        const response = await fetch(`/api/contacts/country-codes?accountId=${selectedAccountId}`);
        const data = await response.json();
        
        if (data.countryCodes && data.countryCodes.length > 0) {
          setCountryCodes(data.countryCodes);
          
          // Auto-populate with detected country codes if no mappings exist
          if (value.length === 0) {
            const defaultMappings: BusinessHourMapping[] = data.countryCodes.map((cc: CountryCode) => ({
              countryCode: cc.countryCode,
              tz: cc.defaultTz,
              startLocal: '09:00',
              endLocal: '17:00',
            }));
            onChange(defaultMappings);
          }
        } else {
          // No valid country codes found - provide manual option
          setCountryCodes([]);
          console.log('No valid country codes detected - phone numbers may not be in international format');
        }
      } catch (error) {
        console.error('Failed to fetch country codes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountryCodes();
  }, [selectedAccountId, value.length, onChange, refreshKey]);

  const addMapping = () => {
    const newMapping: BusinessHourMapping = {
      countryCode: '',
      tz: 'UTC',
      startLocal: '09:00',
      endLocal: '17:00',
    };
    onChange([...value, newMapping]);
  };

  const updateMapping = (index: number, updates: Partial<BusinessHourMapping>) => {
    const updated = [...value];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeMapping = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business Hours by Country</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading country codes...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Business Hours by Country</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure business hours for each country. Speed to Lead will only count time during these hours.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {value.map((mapping, index) => (
          <BusinessHourRow
            key={index}
            mapping={mapping}
            countryCodes={countryCodes}
            onUpdate={(updates) => updateMapping(index, updates)}
            onRemove={() => removeMapping(index)}
          />
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={addMapping}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Country Mapping
        </Button>
      </CardContent>
    </Card>
  );
}

interface BusinessHourRowProps {
  mapping: BusinessHourMapping;
  countryCodes: CountryCode[];
  onUpdate: (updates: Partial<BusinessHourMapping>) => void;
  onRemove: () => void;
}

function BusinessHourRow({ mapping, countryCodes, onUpdate, onRemove }: BusinessHourRowProps) {
  const [countryOpen, setCountryOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [startTimeOpen, setStartTimeOpen] = useState(false);
  const [endTimeOpen, setEndTimeOpen] = useState(false);

  const selectedCountry = countryCodes.find(cc => cc.countryCode === mapping.countryCode);
  const selectedTimezone = TIMEZONES.find(tz => tz.value === mapping.tz);

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg">
      {/* Country Code Selector */}
      <div className="flex-1 min-w-0">
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={countryOpen}
              className="w-full justify-between h-auto p-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedCountry ? (
                  <>
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <div className="text-left min-w-0">
                      <div className="font-medium">{selectedCountry.countryCode}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {selectedCountry.name} ({selectedCountry.count} contacts)
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select country...</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandList>
                <CommandGroup>
                  {countryCodes.map((cc) => (
                    <CommandItem
                      key={cc.countryCode}
                      value={cc.countryCode}
                      onSelect={() => {
                        onUpdate({ 
                          countryCode: cc.countryCode,
                          tz: cc.defaultTz // Auto-update timezone when country changes
                        });
                        setCountryOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          mapping.countryCode === cc.countryCode ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="mr-2">{cc.flag}</span>
                      <div>
                        <div className="font-medium">{cc.countryCode} {cc.name}</div>
                        <div className="text-xs text-muted-foreground">{cc.count} contacts</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Timezone Selector */}
      <div className="flex-1 min-w-0">
        <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={timezoneOpen}
              className="w-full justify-between h-auto p-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="h-4 w-4 shrink-0" />
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{selectedTimezone?.label || mapping.tz}</div>
                  <div className="text-xs text-muted-foreground">{selectedTimezone?.region}</div>
                </div>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0">
            <Command>
              <CommandInput placeholder="Search timezones..." />
              <CommandEmpty>No timezone found.</CommandEmpty>
              <CommandList>
                {['North America', 'Europe', 'Asia Pacific', 'South America'].map((region) => (
                  <CommandGroup key={region} heading={region}>
                    {TIMEZONES
                      .filter(tz => tz.region === region)
                      .map((tz) => (
                        <CommandItem
                          key={tz.value}
                          value={tz.value}
                          onSelect={() => {
                            onUpdate({ tz: tz.value });
                            setTimezoneOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              mapping.tz === tz.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tz.label}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Business Hours */}
      <div className="flex items-center gap-1">
        <Popover open={startTimeOpen} onOpenChange={setStartTimeOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-2">
              <Clock className="h-4 w-4 mr-1" />
              {mapping.startLocal}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  {TIME_OPTIONS.map((time) => (
                    <CommandItem
                      key={time.value}
                      value={time.value}
                      onSelect={() => {
                        onUpdate({ startLocal: time.value });
                        setStartTimeOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          mapping.startLocal === time.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {time.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">–</span>

        <Popover open={endTimeOpen} onOpenChange={setEndTimeOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-auto p-2">
              <Clock className="h-4 w-4 mr-1" />
              {mapping.endLocal}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  {TIME_OPTIONS.map((time) => (
                    <CommandItem
                      key={time.value}
                      value={time.value}
                      onSelect={() => {
                        onUpdate({ endLocal: time.value });
                        setEndTimeOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          mapping.endLocal === time.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {time.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onRemove} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 