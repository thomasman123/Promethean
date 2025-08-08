"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const [target, setTarget] = useState<Element | null>(null)

  useEffect(() => {
    const el = document.querySelector('main[data-slot="sidebar-inset"]')
    setTarget(el)
  }, [pathname, searchParams?.toString()])

  useEffect(() => {
    setActive(true)
    const id = setTimeout(() => setActive(false), 800)
    return () => clearTimeout(id)
  }, [pathname, searchParams?.toString()])

  const overlay = useMemo(() => (
    active && target
      ? createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none bg-background/80 backdrop-blur-sm transition-opacity duration-300">
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          </div>,
          target
        )
      : null
  ), [active, target])

  return (
    <>
      {overlay}
      {children}
    </>
  )
} 