"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Globe } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface BusinessHourMapping {
  countryCode: string
  countryName: string
  flag: string
  timezone: string
  startTime: string
  endTime: string
  workingDays: number[] // 1=Monday, 7=Sunday
}

interface BusinessHoursSelectorProps {
  value: BusinessHourMapping[]
  onChange: (value: BusinessHourMapping[]) => void
}

interface CountryOption {
  country_code: string
  country_name: string
  flag: string
  timezone_options: string[]
  contact_count: number
}

const WEEKDAYS = [
  { value: 1, label: "Mon", short: "M" },
  { value: 2, label: "Tue", short: "T" },
  { value: 3, label: "Wed", short: "W" },
  { value: 4, label: "Thu", short: "T" },
  { value: 5, label: "Fri", short: "F" },
  { value: 6, label: "Sat", short: "S" },
  { value: 7, label: "Sun", short: "S" },
]

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0')
  return { value: `${hour}:00`, label: `${hour}:00` }
})

export function BusinessHoursSelector({ value, onChange }: BusinessHoursSelectorProps) {
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase.rpc('get_available_phone_countries')
        if (error) throw error
        setAvailableCountries(data || [])
      } catch (error) {
        console.error('Error fetching countries:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCountries()
  }, [])

  const addCountry = () => {
    if (availableCountries.length === 0) return
    
    // Find the first country not already added
    const unusedCountry = availableCountries.find(
      country => !value.some(v => v.countryCode === country.country_code)
    )
    
    if (!unusedCountry) return

    const newMapping: BusinessHourMapping = {
      countryCode: unusedCountry.country_code,
      countryName: unusedCountry.country_name,
      flag: unusedCountry.flag,
      timezone: unusedCountry.timezone_options[0],
      startTime: "09:00",
      endTime: "17:00",
      workingDays: [1, 2, 3, 4, 5] // Mon-Fri default
    }

    onChange([...value, newMapping])
  }

  const removeCountry = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateMapping = (index: number, updates: Partial<BusinessHourMapping>) => {
    const newMappings = [...value]
    newMappings[index] = { ...newMappings[index], ...updates }
    onChange(newMappings)
  }

  const toggleWorkingDay = (index: number, day: number) => {
    const mapping = value[index]
    const workingDays = mapping.workingDays.includes(day)
      ? mapping.workingDays.filter(d => d !== day)
      : [...mapping.workingDays, day].sort()
    updateMapping(index, { workingDays })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Business Hours Configuration</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Configure working hours for each country. Speed to Lead will only count time during these hours.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addCountry}
          disabled={value.length >= availableCountries.length}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Country
        </Button>
      </div>

      {value.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No countries configured</p>
              <p className="text-xs mt-1">Click "Add Country" to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {value.map((mapping, index) => {
            const countryData = availableCountries.find(c => c.country_code === mapping.countryCode)
            
            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{mapping.flag}</span>
                      <div>
                        <CardTitle className="text-base">{mapping.countryName}</CardTitle>
                        <CardDescription className="text-xs">
                          {countryData?.contact_count || 0} contacts
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCountry(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Timezone Selection */}
                  <div>
                    <Label className="text-xs">Timezone</Label>
                    <Select
                      value={mapping.timezone}
                      onValueChange={(tz) => updateMapping(index, { timezone: tz })}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countryData?.timezone_options.map(tz => (
                          <SelectItem key={tz} value={tz}>
                            {tz.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Working Days */}
                  <div>
                    <Label className="text-xs">Working Days</Label>
                    <div className="flex gap-1 mt-2">
                      {WEEKDAYS.map(day => (
                        <Button
                          key={day.value}
                          variant={mapping.workingDays.includes(day.value) ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => toggleWorkingDay(index, day.value)}
                        >
                          {day.short}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Working Hours */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Start Time</Label>
                      <Select
                        value={mapping.startTime}
                        onValueChange={(time) => updateMapping(index, { startTime: time })}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">End Time</Label>
                      <Select
                        value={mapping.endTime}
                        onValueChange={(time) => updateMapping(index, { endTime: time })}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map(time => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
} 