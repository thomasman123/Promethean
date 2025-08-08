"use client"

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { SwordsLoader } from '@/components/SwordsLoader'

export function RouteLoader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(true)
    const id = setTimeout(() => setActive(false), 700)
    return () => clearTimeout(id)
  }, [pathname, searchParams?.toString()])

  return (
    <>
      <SwordsLoader active={active} />
      {children}
    </>
  )
} 