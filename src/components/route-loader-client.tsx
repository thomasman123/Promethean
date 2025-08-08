"use client"

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const id = setTimeout(() => setActive(false), 600)
    return () => clearTimeout(id)
  }, [pathname, searchParams?.toString()])

  return (
    <>
      {/* Content overlay loader: covers page content area, keeps navigation visible */}
      {active && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 bg-background/70 backdrop-blur-sm">
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      )}
      {children}
    </>
  )
} 