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
    const id = setTimeout(() => setActive(false), 500)
    return () => clearTimeout(id)
  }, [pathname, searchParams?.toString()])

  const overlay = useMemo(() => (
    active && target
      ? createPortal(
          <div className="absolute inset-x-0 bottom-0 top-16 z-[999] pointer-events-auto bg-background/70 backdrop-blur-sm">
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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