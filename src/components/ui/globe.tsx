"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface Position {
  order: number
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  arcAlt: number
  color: string
}

export interface GlobeConfig {
  pointSize?: number
  globeColor?: string
  showAtmosphere?: boolean
  atmosphereColor?: string
  atmosphereAltitude?: number
  emissive?: string
  emissiveIntensity?: number
  shininess?: number
  polygonColor?: string
  ambientLight?: string
  directionalLeftLight?: string
  directionalTopLight?: string
  pointLight?: string
  arcTime?: number
  arcLength?: number
  rings?: number
  maxRings?: number
  initialPosition?: { lat: number; lng: number }
  autoRotate?: boolean
  autoRotateSpeed?: number
}

export interface WorldProps {
  globeConfig?: GlobeConfig
  data: Position[]
  onCountryClick?: (country: any) => void
  selectedCountries?: string[]
  className?: string
}

// Mock countries data for highlighting
const countries = [
  { name: "United States", lat: 39.8283, lng: -98.5795 },
  { name: "United Kingdom", lat: 55.3781, lng: -3.4360 },
  { name: "Germany", lat: 51.1657, lng: 10.4515 },
  { name: "France", lat: 46.2276, lng: 2.2137 },
  { name: "Japan", lat: 36.2048, lng: 138.2529 },
  { name: "Australia", lat: -25.2744, lng: 133.7751 },
  { name: "Canada", lat: 56.1304, lng: -106.3468 },
  { name: "Brazil", lat: -14.2350, lng: -51.9253 },
  { name: "India", lat: 20.5937, lng: 78.9629 },
  { name: "China", lat: 35.8617, lng: 104.1954 },
]

export function Globe({ 
  globeConfig, 
  data, 
  onCountryClick, 
  selectedCountries = [],
  className
}: WorldProps) {
  const [highlightedCountries, setHighlightedCountries] = useState<Set<string>>(new Set(selectedCountries))
  const [isLoading, setIsLoading] = useState(true)

  const handleCountryClick = (country: typeof countries[0]) => {
    const newHighlighted = new Set(highlightedCountries)
    
    if (newHighlighted.has(country.name)) {
      newHighlighted.delete(country.name)
    } else {
      newHighlighted.add(country.name)
    }
    
    setHighlightedCountries(newHighlighted)
    onCountryClick?.(country)
  }

  useEffect(() => {
    setHighlightedCountries(new Set(selectedCountries))
  }, [selectedCountries])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={cn("w-full h-full relative", className)}>
      {isLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/70">Loading Interactive Globe...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mock Globe Background */}
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-lg relative overflow-hidden">
            {/* Simulated Globe */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-96 h-96 rounded-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 relative animate-pulse shadow-2xl">
                {/* Continents overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-900/30 via-yellow-900/20 to-brown-900/30"></div>
                
                {/* Country Points */}
                {countries.map((country, index) => (
                  <button
                    key={country.name}
                    onClick={() => handleCountryClick(country)}
                    className={cn(
                      "absolute w-3 h-3 rounded-full border-2 border-white/50 transition-all duration-200 hover:scale-125",
                      highlightedCountries.has(country.name) 
                        ? "bg-blue-400 border-blue-300 shadow-lg shadow-blue-400/50" 
                        : "bg-white/70 hover:bg-white"
                    )}
                    style={{
                      top: `${20 + (index % 3) * 25 + Math.sin(index) * 10}%`,
                      left: `${15 + (index % 4) * 20 + Math.cos(index) * 15}%`
                    }}
                    title={country.name}
                  />
                ))}

                {/* Rotating animation effect */}
                <div className="absolute inset-2 rounded-full border border-white/10 animate-spin" style={{ animationDuration: '20s' }}></div>
                <div className="absolute inset-6 rounded-full border border-white/5 animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }}></div>
              </div>
            </div>
            
            {/* Atmosphere glow */}
            <div className="absolute inset-0 rounded-lg bg-blue-500/10 blur-xl"></div>
          </div>

          {/* Selected Countries Display */}
          {highlightedCountries.size > 0 && (
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white max-w-xs">
              <h3 className="text-sm font-semibold mb-2">Selected Countries:</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(highlightedCountries).map((country) => (
                  <div key={country} className="text-xs flex items-center justify-between">
                    <span>{country}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 text-white/70 hover:text-white"
                      onClick={() => {
                        const newHighlighted = new Set(highlightedCountries)
                        newHighlighted.delete(country)
                        setHighlightedCountries(newHighlighted)
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 