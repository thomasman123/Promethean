"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog"
import { Button } from "./button"
import { Badge } from "./badge"
import { Globe, Position } from "./globe"
import { cn } from "@/lib/utils"

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [globeData, setGlobeData] = useState<Position[]>([])

  // Load globe data on mount
  useEffect(() => {
    fetch('/globe.json')
      .then(res => res.json())
      .then(data => setGlobeData(data))
      .catch(err => console.error('Failed to load globe data:', err))
  }, [])

  const handleCountryClick = (country: any) => {
    console.log('Country clicked:', country)
    const countryName = country.name
    
    setSelectedCountries(prev => {
      if (prev.includes(countryName)) {
        return prev.filter(c => c !== countryName)
      } else {
        return [...prev, countryName]
      }
    })
  }

  const clearSelections = () => {
    setSelectedCountries([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Global Locations
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Select countries and regions by clicking on the interactive globe
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectedCountries.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelections}
                >
                  Clear All ({selectedCountries.length})
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative overflow-hidden rounded-b-lg">
          <Globe
            data={globeData}
            selectedCountries={selectedCountries}
            onCountryClick={handleCountryClick}
            className="h-full"
          />
          
          {/* Interactive Instructions */}
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white max-w-xs">
            <h3 className="text-sm font-semibold mb-2">How to Use:</h3>
            <ul className="text-xs space-y-1">
              <li>• Click on countries to select/deselect them</li>
              <li>• Drag to rotate the globe</li>
              <li>• Scroll to zoom in/out</li>
              <li>• Selected countries appear highlighted</li>
            </ul>
          </div>

          {/* Selected Countries Display */}
          {selectedCountries.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 max-w-sm">
              <h3 className="text-sm font-semibold mb-2 text-gray-900">
                Selected Locations ({selectedCountries.length})
              </h3>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {selectedCountries.map((country) => (
                  <Badge
                    key={country}
                    variant="secondary"
                    className="text-xs cursor-pointer hover:bg-red-100"
                    onClick={() => {
                      setSelectedCountries(prev => 
                        prev.filter(c => c !== country)
                      )
                    }}
                  >
                    {country} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 