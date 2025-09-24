"use client"

import { useEffect, useRef, useState } from "react"

interface HighlightPoint {
  lat: number
  lng: number
  color?: string
}

export type GithubGlobeProps = {
  className?: string
  initialPoints?: HighlightPoint[]
  globeColor?: string
  atmosphereColor?: string
  pointColor?: string
}

export function GithubGlobe({
  className,
  initialPoints = [],
  globeColor = "#1b1b1b",
  atmosphereColor = "#88c0ff",
  pointColor = "#22d3ee",
}: GithubGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<any>(null)
  const [points, setPoints] = useState<HighlightPoint[]>(initialPoints)

  const ringsRef = useRef<
    { lat: number; lng: number; maxRadius: number; propagationSpeed: number; repeatPeriod: number; color: string }[]
  >([])

  // null => all selected; otherwise set of ISO3 codes
  const selectionRef = useRef<Set<string> | null>(null)
  const [countriesLoaded, setCountriesLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!containerRef.current) return

    let isCancelled = false
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const init = async () => {
      const [{ default: Globe }] = await Promise.all([
        import("globe.gl"),
      ])
      if (isCancelled) return

      const globe = new (Globe as any)(container, { animateIn: false })
      globeRef.current = globe

      globe
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-dark.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .showAtmosphere(true)
        .atmosphereColor(atmosphereColor)
        .atmosphereAltitude(0.15)
        .width(width)
        .height(height)
        .enablePointerInteraction(true)

      const material = globe.globeMaterial()
      if (material?.color?.set) material.color.set(globeColor)

      globe
        .pointsData(points)
        .pointLat((d: any) => d.lat)
        .pointLng((d: any) => d.lng)
        .pointAltitude(() => 0.02)
        .pointRadius(() => 0.6)
        .pointColor((d: any) => d.color || pointColor)

      globe
        .ringsData(ringsRef.current)
        .ringLat((d: any) => d.lat)
        .ringLng((d: any) => d.lng)
        .ringColor((d: any) => d.color || pointColor)
        .ringMaxRadius((d: any) => d.maxRadius)
        .ringPropagationSpeed((d: any) => d.propagationSpeed)
        .ringRepeatPeriod((d: any) => d.repeatPeriod)

      // Countries (polygons)
      try {
        // Primary source (CORS-enabled)
        let res = await fetch(
          "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
        )
        if (!res.ok) {
          // Secondary source
          res = await fetch(
            "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"
          )
        }
        if (!res.ok) {
          // Local fallback (optional): place a file at public/data/countries.geo.json
          res = await fetch("/data/countries.geo.json")
        }
        if (!res.ok) throw new Error("Failed to load countries geojson")
        const geojson = await res.json()

        const getIso = (feat: any) =>
          feat?.properties?.ISO_A3 || feat?.properties?.ADM0_A3 || feat?.properties?.A3 || feat?.properties?.NAME

        const getFeatureCenter = (feat: any) => {
          try {
            const geom = feat?.geometry
            if (!geom) return null
            const collect = (coords: any[]) => {
              let sumLat = 0
              let sumLng = 0
              let count = 0
              for (const c of coords) {
                const [lng, lat] = c
                if (typeof lat === "number" && typeof lng === "number") {
                  sumLat += lat
                  sumLng += lng
                  count++
                }
              }
              if (count === 0) return null
              return { lat: sumLat / count, lng: sumLng / count }
            }
            if (geom.type === "Polygon") {
              // use outer ring
              return collect(geom.coordinates?.[0] || [])
            } else if (geom.type === "MultiPolygon") {
              // first polygon outer ring
              return collect(geom.coordinates?.[0]?.[0] || [])
            }
          } catch {}
          return null
        }

        const applyPolygonStyles = () => {
          const sel = selectionRef.current
          globe
            .polygonsData(geojson.features)
            .polygonCapColor((d: any) => {
              const iso = getIso(d)
              const isSelected = !sel || sel.has(iso)
              return isSelected ? "rgba(34,211,238,0.45)" : "rgba(120,120,120,0.18)"
            })
            .polygonSideColor((d: any) => {
              const iso = getIso(d)
              const isSelected = !sel || sel.has(iso)
              return isSelected ? "rgba(34,211,238,0.35)" : "rgba(90,90,90,0.15)"
            })
            .polygonStrokeColor((d: any) => {
              const iso = getIso(d)
              const isSelected = !sel || sel.has(iso)
              return isSelected ? "#22d3ee" : "#3a3a3a"
            })
            .polygonAltitude((d: any) => {
              const iso = getIso(d)
              const isSelected = !sel || sel.has(iso)
              return isSelected ? 0.02 : 0.005
            })
        }

        applyPolygonStyles()
        setCountriesLoaded(true)

        // Toggle/select logic
        // Single click selects one; Shift/Ctrl/Cmd toggles multi-select
        ;(globe as any).onPolygonClick((poly: any, event: MouseEvent) => {
          const iso = getIso(poly)
          const multi = !!(event?.shiftKey || event?.ctrlKey || (event as any)?.metaKey)

          if (!multi) {
            if (selectionRef.current && selectionRef.current.size === 1 && selectionRef.current.has(iso)) {
              selectionRef.current = null // back to all
            } else {
              selectionRef.current = new Set([iso])
            }
          } else {
            if (!selectionRef.current) selectionRef.current = new Set([iso])
            else if (selectionRef.current.has(iso)) {
              selectionRef.current.delete(iso)
              if (selectionRef.current.size === 0) selectionRef.current = null
            } else selectionRef.current.add(iso)
          }

          applyPolygonStyles()
          // Focus POV to polygon centroid
          const center = getFeatureCenter(poly)
          if (center) {
            globe.pointOfView({ lat: center.lat, lng: center.lng, altitude: 1.2 }, 700)
          }
        })
      } catch (e) {
        console.error(e)
      }

      // Background click -> add point
      ;(globe as any).onGlobeClick((lat: number, lng: number) => {
        const newPt: HighlightPoint = { lat, lng, color: pointColor }
        setPoints((prev) => {
          const next = [...prev, newPt]
          globe.pointsData(next)
          return next
        })

        ringsRef.current = [
          {
            lat,
            lng,
            maxRadius: 5,
            propagationSpeed: 2,
            repeatPeriod: 700,
            color: pointColor,
          },
        ]
        globe.ringsData(ringsRef.current)

        globe.pointOfView({ lat, lng, altitude: 1.2 }, 800)
      })

      const controls: any = globe.controls()
      if (controls) {
        controls.enablePan = false
        controls.enableZoom = false // only drag rotate
      }

      const onResize = () => {
        if (!containerRef.current) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        globe.width(w)
        globe.height(h)
      }
      window.addEventListener("resize", onResize)

      return () => {
        window.removeEventListener("resize", onResize)
      }
    }

    let cleanup: (() => void) | undefined
    init()
      .then((fn) => {
        if (typeof fn === "function") cleanup = fn
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      isCancelled = true
      try {
        cleanup?.()
        if (container) container.innerHTML = ""
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointsData(points)
    }
  }, [points])

  return <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />
} 