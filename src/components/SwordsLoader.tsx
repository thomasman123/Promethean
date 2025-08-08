"use client"

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export function SwordsLoader({ active }: { active: boolean }) {
  const [value, setValue] = useState(10)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (!active) {
      setValue(0)
      setCompleted(false)
      return
    }
    setValue(10)
    setCompleted(false)
    const interval = setInterval(() => {
      setValue((v) => {
        const next = v + Math.random() * 20
        if (next >= 100) {
          clearInterval(interval)
          setTimeout(() => setCompleted(true), 200)
          return 100
        }
        return Math.min(95, next)
      })
    }, 150)
    return () => clearInterval(interval)
  }, [active])

  return (
    <div className={cn('fixed left-0 right-0 top-0 z-50 pointer-events-none transition-opacity', active ? 'opacity-100' : 'opacity-0')}
    >
      <div className="mx-auto max-w-screen-2xl px-4">
        <Progress value={value} />
      </div>
      {/* Swords animation */}
      <div className="relative mx-auto mt-2 flex h-6 w-10 items-center justify-center">
        <div className={cn('transition-transform duration-500 origin-bottom', completed ? 'translate-x-2 rotate-45' : '')}>
          <span className="block h-5 w-0.5 rounded bg-primary" />
        </div>
        <div className={cn('transition-transform duration-500 origin-bottom', completed ? '-translate-x-2 -rotate-45' : '')}>
          <span className="block h-5 w-0.5 rounded bg-primary" />
        </div>
      </div>
    </div>
  )
} 