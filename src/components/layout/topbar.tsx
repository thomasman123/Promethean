"use client"

import { cn } from "@/lib/utils"
import { Sword, Home, RefreshCw, Settings, Sun, Moon, LogOut, ChevronDown } from "lucide-react"
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
import { usePathname } from "next/navigation"

export function TopBar() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { href: "/", label: "Overview", icon: Home },
    { href: "/update-data", label: "Update Data", icon: RefreshCw },
    { href: "/account", label: "Account", icon: Settings },
  ]

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

        {/* Account Dropdown - Styled like a combobox */}
        <Select defaultValue="account1">
          <SelectTrigger className={cn(
            "w-[200px] h-9 px-3 rounded-lg",
            "bg-background/50 backdrop-blur-sm border",
            "hover:bg-background/80 transition-colors"
          )}>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="account1">Production Account</SelectItem>
            <SelectItem value="account2">Development Account</SelectItem>
            <SelectItem value="account3">Staging Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Center section - Main Navigation */}
      <div className={cn(
        "flex items-center gap-1 px-1 py-1 rounded-full",
        "bg-background/50 backdrop-blur-sm border"
      )}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Right section - Placeholder, Dark mode toggle, Profile */}
      <div className="flex items-center gap-3">
        {/* Placeholder for future context-specific dropdowns */}
        <div className="w-[120px]" />

        {/* Dark mode toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={cn(
            "rounded-lg p-2 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.jpg" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 