"use client"

import { useEffect, useRef, useState } from "react"
import Globe from "globe.gl"

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

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

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
      .autoRotate(false)
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

    // @ts-ignore
    globe.onGlobeClick((lat: number, lng: number) => {
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
      try {
        container.innerHTML = ""
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