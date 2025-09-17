"use client"

import { Calendar, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export type PeriodView = 'daily' | 'weekly' | 'monthly'

interface PeriodViewDropdownProps {
  value: PeriodView
  onChange: (value: PeriodView) => void
}

export function PeriodViewDropdown({ value, onChange }: PeriodViewDropdownProps) {
  const getLabel = () => {
    if (value === 'daily') return 'Daily View'
    if (value === 'weekly') return 'Weekly View'
    if (value === 'monthly') return 'Monthly View'
    return 'Select Period'
  }

  const getIcon = () => {
    return <Calendar className="h-4 w-4 mr-2" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {getIcon()}
          {getLabel()}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Period View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onChange('daily')}
          className={value === 'daily' ? 'bg-accent' : ''}
        >
          Daily View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange('weekly')}
          className={value === 'weekly' ? 'bg-accent' : ''}
        >
          Weekly View
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onChange('monthly')}
          className={value === 'monthly' ? 'bg-accent' : ''}
        >
          Monthly View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 