"use client"

import { cn } from "@/lib/utils"
import { Sword, Home, RefreshCw, Settings, Sun, Moon, LogOut, ChevronDown, LayoutDashboard, Database, Calendar, Users, CreditCard } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

interface Account {
  id: string
  name: string
  description?: string
}

export function TopBar() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Initialize dark mode from localStorage or system preference
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    // Load user accounts
    loadUserAccounts()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const loadUserAccounts = async () => {
    try {
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        if (data.accounts && data.accounts.length > 0) {
          setAccounts(data.accounts)
          
          // Set first account as selected if none selected
          const savedAccountId = localStorage.getItem('selectedAccountId')
          if (savedAccountId && data.accounts.find((a: Account) => a.id === savedAccountId)) {
            setSelectedAccountId(savedAccountId)
          } else {
            setSelectedAccountId(data.accounts[0].id)
            localStorage.setItem('selectedAccountId', data.accounts[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  }

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    localStorage.setItem('selectedAccountId', accountId)
    
    // Trigger a custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }))
  }

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const navItems = [
    { 
      href: "/", 
      label: "Overview", 
      icon: Home,
      dropdownItems: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/data-view", label: "Data View", icon: Database }
      ]
    },
    { 
      href: "/update-data", 
      label: "Update Data", 
      icon: RefreshCw,
      dropdownItems: [
        { href: "/update-data/appointments-discoveries", label: "Appointments/Discoveries", icon: Calendar },
        { href: "/update-data/follow-ups", label: "Follow Ups", icon: Users },
        { href: "/update-data/payment-plans", label: "Payment Plans", icon: CreditCard }
      ]
    },
    { 
      href: "/account", 
      label: "Account", 
      icon: Settings,
      dropdownItems: null
    },
  ]

  const handleIconClick = (item: typeof navItems[0]) => {
    if (item.dropdownItems && item.dropdownItems.length > 0) {
      router.push(item.dropdownItems[0].href)
    } else {
      router.push(item.href)
    }
  }

  const handleMouseEnter = (itemHref: string) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    const timeout = setTimeout(() => {
      setOpenDropdown(itemHref)
    }, 200) // 200ms delay
    setHoverTimeout(timeout)
  }

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    const timeout = setTimeout(() => {
      setOpenDropdown(null)
    }, 100) // Small delay before closing
    setHoverTimeout(timeout)
  }

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-200",
      isScrolled ? "bg-background/80 backdrop-blur-md border-b" : "bg-transparent"
    )}>
      {/* Left section - Logo and Account Dropdown */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sword className="h-6 w-6 text-primary" />
        </div>

        {/* Account Dropdown - Styled with pill shape */}
        {accounts.length > 0 && (
          <Select value={selectedAccountId} onValueChange={handleAccountChange}>
            <SelectTrigger className={cn(
              "w-[200px] h-10 px-4 rounded-full",
              "bg-muted/50 backdrop-blur-sm border border-border/50",
              "hover:bg-muted/80 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border bg-popover/95 backdrop-blur-sm">
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id} className="rounded-xl focus:bg-accent">
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Center section - Main Navigation with Icon Only */}
      <div className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-full",
        "bg-muted/50 backdrop-blur-sm border border-border/50"
      )}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          
          if (item.dropdownItems) {
            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => handleMouseEnter(item.href)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  onClick={() => handleIconClick(item)}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-full transition-all duration-200",
                    "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
                
                {openDropdown === item.href && (
                  <div 
                    className={cn(
                      "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50",
                      "rounded-full border bg-popover/95 backdrop-blur-sm shadow-lg",
                      "animate-in fade-in-0 zoom-in-95 duration-200"
                    )}
                    onMouseEnter={() => {
                      if (hoverTimeout) clearTimeout(hoverTimeout)
                      setOpenDropdown(item.href)
                    }}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="flex items-center gap-1 px-1 py-1">
                      {item.dropdownItems.map((dropdownItem) => {
                        const DropdownIcon = dropdownItem.icon
                        return (
                          <Link
                            key={dropdownItem.href}
                            href={dropdownItem.href}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs cursor-pointer hover:bg-accent transition-colors whitespace-nowrap"
                          >
                            <DropdownIcon className="h-3 w-3 text-muted-foreground" />
                            <span>{dropdownItem.label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center p-2 rounded-full transition-all duration-200",
                "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          )
        })}
      </div>

      {/* Right section - Placeholder, Dark mode toggle, Profile */}
      <div className="flex items-center gap-3">
        {/* Placeholder for future context-specific dropdowns */}
        <div className="w-[120px]" />

        {/* Dark mode toggle - Pill shaped */}
        <button
          onClick={toggleDarkMode}
          className={cn(
            "rounded-full p-2.5 transition-all duration-200",
            "bg-muted/50 backdrop-blur-sm border border-border/50",
            "hover:bg-muted/80",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background">
              <Avatar className="h-9 w-9 border border-border/50">
                <AvatarImage src="/avatar.jpg" alt="User" />
                <AvatarFallback className="bg-muted">U</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl border bg-popover/95 backdrop-blur-sm">
            <DropdownMenuItem className="cursor-pointer rounded-xl focus:bg-accent">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 