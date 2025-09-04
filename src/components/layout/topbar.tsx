"use client"

import { cn } from "@/lib/utils"
import { Sword, Home, RefreshCw, Settings, Sun, Moon, LogOut, ChevronDown, LayoutDashboard, Database, Calendar, Users, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
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

export function TopBar() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
        <Select defaultValue="account1">
          <SelectTrigger className={cn(
            "w-[200px] h-10 px-4 rounded-full",
            "bg-muted/50 backdrop-blur-sm border border-border/50",
            "hover:bg-muted/80 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border bg-popover/95 backdrop-blur-sm">
            <SelectItem value="account1" className="rounded-xl focus:bg-accent">Production Account</SelectItem>
            <SelectItem value="account2" className="rounded-xl focus:bg-accent">Development Account</SelectItem>
            <SelectItem value="account3" className="rounded-xl focus:bg-accent">Staging Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Center section - Main Navigation with Icon Only */}
      <div className={cn(
        "flex items-center gap-4 px-4 py-2 rounded-full",
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
                onMouseEnter={() => setOpenDropdown(item.href)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  onClick={() => handleIconClick(item)}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-full transition-all duration-200",
                    "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                    isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
                
                {openDropdown === item.href && (
                  <div className={cn(
                    "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50",
                    "w-56 rounded-2xl border bg-popover/95 backdrop-blur-sm shadow-lg",
                    "animate-in fade-in-0 zoom-in-95 duration-200"
                  )}>
                    <div className="p-1">
                      {item.dropdownItems.map((dropdownItem) => {
                        const DropdownIcon = dropdownItem.icon
                        return (
                          <Link
                            key={dropdownItem.href}
                            href={dropdownItem.href}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors"
                          >
                            <DropdownIcon className="h-4 w-4 text-muted-foreground" />
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
                "flex items-center justify-center p-3 rounded-full transition-all duration-200",
                "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              )}
            >
              <Icon className="h-5 w-5" />
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