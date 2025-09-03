"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  User, 
  Users, 
  CreditCard, 
  Zap, 
  BarChart3, 
  Receipt, 
  Tag 
} from "lucide-react"

const navigationItems = [
  { href: "/", icon: Home, label: "Overview" },
  { href: "/account", icon: User, label: "Account" },
  { href: "/team", icon: Users, label: "Team" },
  { href: "/subscription", icon: CreditCard, label: "Subscription Plans" },
  { href: "/compute", icon: Zap, label: "Buy Compute Packs" },
  { href: "/statistics", icon: BarChart3, label: "Usage Statistics" },
  { href: "/billing", icon: Receipt, label: "Billing" },
  { href: "/promo", icon: Tag, label: "Promo" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 w-64 h-full bg-background border-r border-border">
      <div className="flex flex-col h-full">
        {/* Logo/Brand area */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <span className="font-semibold text-lg">Promethean</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </aside>
  )
} 