"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [target, setTarget] = useState<Element | null>(null)
  const [topOffset, setTopOffset] = useState<number>(64) // default h-16

  useEffect(() => {
    const el = document.querySelector('main[data-slot="sidebar-inset"]')
    setTarget(el)
    // measure header inside inset
    const header = el?.querySelector('header') as HTMLElement | null
    if (header) setTopOffset(header.offsetHeight || 64)
  }, [pathname, searchParams?.toString()])

  useEffect(() => {
    setActive(true)
    const id = setTimeout(() => setActive(false), 1000)
    return () => clearTimeout(id)
  }, [pathname, searchParams?.toString()])

  const overlay = useMemo(() => (
    active && target
      ? createPortal(
          <div
            className="absolute inset-x-0 bottom-0 z-[9999] pointer-events-auto bg-background/65 backdrop-blur-sm transition-opacity duration-200"
            style={{ top: topOffset }}
          >
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          </div>,
          target
        )
      : null
  ), [active, target, topOffset])

  return (
    <>
      {overlay}
      {children}
    </>
  )
} 