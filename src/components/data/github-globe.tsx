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
  // New: controlled selection and callbacks
  selectedISOs?: string[] | null
  onSelectionChange?: (selected: string[] | null) => void
  onCountriesLoaded?: (countries: { iso3: string; name: string }[]) => void
}

export function GithubGlobe({
  className,
  initialPoints = [],
  globeColor = "#1b1b1b",
  atmosphereColor = "#88c0ff",
  pointColor = "#22d3ee",
  selectedISOs = null,
  onSelectionChange,
  onCountriesLoaded,
}: GithubGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const globeRef = useRef<any>(null)
  const [points, setPoints] = useState<HighlightPoint[]>(initialPoints)

  const ringsRef = useRef<
    { lat: number; lng: number; maxRadius: number; propagationSpeed: number; repeatPeriod: number; color: string }[]
  >([])

  // null => all selected; otherwise set of ISO3 codes
  const selectionRef = useRef<Set<string> | null>(null)
  const featuresRef = useRef<any[]>([])
  const [countriesLoaded, setCountriesLoaded] = useState(false)

  // Helper functions kept stable via refs
  const getIsoRef = useRef<(feat: any) => string>(
    (feat: any) => {
      const p = feat?.properties || {}
      // Cover common schemas
      return (
        p.ISO_A3 || p.iso_a3 || p.ADM0_A3 || p.adm0_a3 || p.A3 || p.ISO3 || feat?.id || p.id || p.NAME || p.name || "UNK"
      )
    }
  )

  const applyPolygonStyles = () => {
    if (!globeRef.current) return
    const globe = globeRef.current
    const sel = selectionRef.current
    globe
      .polygonsData(featuresRef.current)
      .polygonCapColor((d: any) => {
        const iso = getIsoRef.current(d)
        const isSelected = !sel || sel.has(iso)
        return isSelected ? "rgba(34,211,238,0.45)" : "rgba(120,120,120,0.18)"
      })
      .polygonSideColor((d: any) => {
        const iso = getIsoRef.current(d)
        const isSelected = !sel || sel.has(iso)
        return isSelected ? "rgba(34,211,238,0.35)" : "rgba(90,90,90,0.15)"
      })
      .polygonStrokeColor((d: any) => {
        const iso = getIsoRef.current(d)
        const isSelected = !sel || sel.has(iso)
        return isSelected ? "#22d3ee" : "#3a3a3a"
      })
      .polygonAltitude((d: any) => {
        const iso = getIsoRef.current(d)
        const isSelected = !sel || sel.has(iso)
        return isSelected ? 0.02 : 0.005
      })
      .polygonsTransitionDuration(0)
  }

  // Sync internal selection from external prop
  useEffect(() => {
    if (selectedISOs === null) {
      selectionRef.current = null
    } else {
      selectionRef.current = new Set(selectedISOs)
    }
    if (countriesLoaded) applyPolygonStyles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedISOs])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!containerRef.current) return

    let isCancelled = false
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const fetchWithTimeout = async (url: string, ms = 6000) => {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), ms)
      try {
        const res = await fetch(url, { signal: controller.signal })
        return res
      } finally {
        clearTimeout(id)
      }
    }

    const tryLoadGeo = async (): Promise<any[] | null> => {
      const urls = [
        // Prefer reliably CORS-enabled sources first
        "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
        "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
        "https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson",
        "https://cdn.jsdelivr.net/npm/geojson-world@3.0.0/countries.geo.json",
        "/data/countries.geo.json",
      ]
      for (const url of urls) {
        try {
          const res = await fetchWithTimeout(url, 8000)
          if (!res.ok) continue
          const geojson = await res.json()
          const features = geojson?.features
          if (Array.isArray(features) && features.length) return features
        } catch (e) {
          // continue to next url
        }
      }
      return null
    }

    const tryLoadCountryListOnly = async () => {
      try {
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca3")
        if (!res.ok) return
        const data = await res.json()
        const list = (data || []).map((c: any) => ({ iso3: c.cca3, name: c?.name?.common || c.cca3 }))
        onCountriesLoaded?.(list)
      } catch {}
    }

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
        .bumpImageUrl(undefined as any)
        .showAtmosphere(true)
        .atmosphereColor("#0e7490")
        .atmosphereAltitude(0.05)
        .width(width)
        .height(height)
        .enablePointerInteraction(true)

      const material = globe.globeMaterial()
      if (material?.color?.set) material.color.set(globeColor)
      if (material) {
        // flatten shading
        ;(material as any).flatShading = true
      }

      globe
        .pointsData(points)
        .pointLat((d: any) => d.lat)
        .pointLng((d: any) => d.lng)
        .pointAltitude(() => 0.01)
        .pointRadius(() => 0.5)
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
        const features = await tryLoadGeo()
        if (!features) throw new Error("Failed to load countries geojson from all sources")

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
              return collect(geom.coordinates?.[0] || [])
            } else if (geom.type === "MultiPolygon") {
              return collect(geom.coordinates?.[0]?.[0] || [])
            }
          } catch {}
          return null
        }

        // Cache features and apply initial styles
        featuresRef.current = features

        // Initialize selection from prop on first load
        if (selectedISOs === null) {
          selectionRef.current = null
        } else {
          selectionRef.current = new Set(selectedISOs)
        }

        applyPolygonStyles()
        setCountriesLoaded(true)

        // Emit country list to parent
        if (onCountriesLoaded) {
          try {
            const countries = featuresRef.current.map((f: any) => {
              const iso = String(getIsoRef.current(f) || "UNK")
              const props = f?.properties || {}
              const name = props.ADMIN || props.admin || props.NAME || props.name || iso
              return { iso3: iso, name }
            })
            onCountriesLoaded(countries)
          } catch {}
        }

        // Toggle/select logic
        ;(globe as any).onPolygonClick((poly: any, event: MouseEvent) => {
          const iso = getIsoRef.current(poly)
          const multi = !!(event?.shiftKey || event?.ctrlKey || (event as any)?.metaKey)

          const current = selectionRef.current
          if (!multi) {
            if (current && current.size === 1 && current.has(iso)) {
              // Deselect the only selected country -> empty selection
              selectionRef.current = new Set()
            } else {
              // Select only this country
              selectionRef.current = new Set([iso])
            }
          } else {
            if (!current) {
              // Start from empty set when previously "all"
              selectionRef.current = new Set([iso])
            } else if (current.has(iso)) {
              current.delete(iso)
              selectionRef.current = current // keep empty set if size becomes 0
            } else {
              current.add(iso)
              selectionRef.current = current
            }
          }

          applyPolygonStyles()
          onSelectionChange?.(selectionRef.current ? Array.from(selectionRef.current) : null)

          const center = getFeatureCenter(poly)
          if (center) {
            // Gentle recenter without zooming in too far to avoid clipping
            const current = (globe as any).pointOfView()
            const altitude = current?.altitude && current.altitude > 1 ? current.altitude : 1.4
            globe.pointOfView({ lat: center.lat, lng: center.lng, altitude }, 600)
          }
        })

        // Background click -> add point (visual feedback)
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

          const current = (globe as any).pointOfView()
          const altitude = current?.altitude && current.altitude > 1 ? current.altitude : 1.4
          globe.pointOfView({ lat, lng, altitude }, 600)
        })
      } catch (e) {
        console.error(e)
        // Populate side list even if polygons failed
        tryLoadCountryListOnly()
      }

      const controls: any = globe.controls()
      if (controls) {
        controls.enablePan = false
        controls.enableZoom = false // only drag rotate
        controls.minDistance = 200
        controls.maxDistance = 700
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