"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

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

const defaultGlobeConfig: GlobeConfig = {
  pointSize: 4,
  globeColor: "#062056",
  showAtmosphere: true,
  atmosphereColor: "#FFFFFF",
  atmosphereAltitude: 0.1,
  emissive: "#062056",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "rgba(255,255,255,0.7)",
  ambientLight: "#38bdf8",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 22.3193, lng: 114.1694 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
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
  const globeRef = useRef<HTMLDivElement>(null)
  const [highlightedCountries, setHighlightedCountries] = useState<Set<string>>(new Set(selectedCountries))
  const [globeInstance, setGlobeInstance] = useState<any>(null)

  const config = { ...defaultGlobeConfig, ...globeConfig }

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
    // Dynamic import to avoid SSR issues
    const initGlobe = async () => {
      if (!globeRef.current || typeof window === 'undefined') return

      try {
        // Dynamic import of globe.gl
        const { default: Globe } = await import('globe.gl')
        
                 const globe = new Globe(globeRef.current)
          .width(globeRef.current.offsetWidth)
          .height(globeRef.current.offsetHeight)
          .backgroundColor("rgba(0,0,0,0)")
          .globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
          .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
          .showGlobe(true)
          .showAtmosphere(config.showAtmosphere || true)
          .atmosphereColor(config.atmosphereColor || "#FFFFFF")
          .atmosphereAltitude(config.atmosphereAltitude || 0.1)
          .arcsData(data)
          .arcColor("color")
          .arcDashLength(config.arcLength!)
          .arcDashGap(2)
          .arcDashAnimateTime(config.arcTime!)
          .arcsTransitionDuration(1000)
          .arcDashInitialGap(() => Math.random() * 5)
          .pointOfView(config.initialPosition!, 1000)
          .pointsData(countries)
          .pointColor((country: any) => 
            highlightedCountries.has(country.name) 
              ? "#3b82f6" 
              : "#ffffff"
          )
          .pointAltitude(0.1)
          .pointRadius(0.5)
          .onPointClick((point: any) => {
            handleCountryClick(point)
          })

        // Auto-rotation
        if (config.autoRotate) {
          globe.controls().autoRotate = true
          globe.controls().autoRotateSpeed = config.autoRotateSpeed!
        }

        setGlobeInstance(globe)

        const handleResize = () => {
          if (globe && globeRef.current) {
            globe
              .width(globeRef.current.offsetWidth)
              .height(globeRef.current.offsetHeight)
          }
        }

        window.addEventListener("resize", handleResize)

        return () => {
          window.removeEventListener("resize", handleResize)
        }
      } catch (error) {
        console.error("Failed to load globe:", error)
      }
    }

    initGlobe()
  }, [])

  // Update point colors when highlighted countries change
  useEffect(() => {
    if (globeInstance) {
      globeInstance.pointColor((country: any) => 
        highlightedCountries.has(country.name) 
          ? "#3b82f6" 
          : "#ffffff"
      )
    }
  }, [highlightedCountries, globeInstance])

  useEffect(() => {
    setHighlightedCountries(new Set(selectedCountries))
  }, [selectedCountries])

  return (
    <div className={cn("w-full h-full", className)}>
      <div
        ref={globeRef}
        className="w-full h-full"
        style={{ background: "transparent" }}
      />
      {highlightedCountries.size > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
          <h3 className="text-sm font-semibold mb-2">Selected Countries:</h3>
          <div className="space-y-1">
            {Array.from(highlightedCountries).map((country) => (
              <div key={country} className="text-xs">{country}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 