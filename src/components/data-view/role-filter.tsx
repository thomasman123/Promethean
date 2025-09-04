"use client"

import { useState } from 'react'
import { Users, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export type RoleFilter = 'setter' | 'rep' | 'both'

interface RoleFilterDropdownProps {
  value: RoleFilter
  onChange: (value: RoleFilter) => void
}

export function RoleFilterDropdown({ value, onChange }: RoleFilterDropdownProps) {
  const [isSetterChecked, setIsSetterChecked] = useState(value === 'setter' || value === 'both')
  const [isRepChecked, setIsRepChecked] = useState(value === 'rep' || value === 'both')

  const handleChange = (setter: boolean, rep: boolean) => {
    setIsSetterChecked(setter)
    setIsRepChecked(rep)
    
    if (setter && rep) {
      onChange('both')
    } else if (setter) {
      onChange('setter')
    } else if (rep) {
      onChange('rep')
    } else {
      // At least one must be selected
      onChange('both')
      setIsSetterChecked(true)
      setIsRepChecked(true)
    }
  }

  const getLabel = () => {
    if (value === 'both') return 'All Roles'
    if (value === 'setter') return 'Appointment Setters'
    if (value === 'rep') return 'Sales Reps'
    return 'Select Role'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Users className="h-4 w-4 mr-2" />
          {getLabel()}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={isSetterChecked}
          onCheckedChange={(checked) => handleChange(checked, isRepChecked)}
        >
          Appointment Setters
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={isRepChecked}
          onCheckedChange={(checked) => handleChange(isSetterChecked, checked)}
        >
          Sales Reps
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 