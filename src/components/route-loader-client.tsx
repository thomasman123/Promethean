"use client"

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function ClientLoader({ children }: { children: (active: boolean) => React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)

  useEffect(() => {
    // Trigger on navigation start
    setActive(true)
    const id = setTimeout(() => setActive(false), 700)
    return () => clearTimeout(id)
  }, [pathname, searchParams?.toString()])

  return <>{children(active)}</>
} 