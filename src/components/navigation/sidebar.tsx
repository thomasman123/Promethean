"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigationItems = [
  { href: "/", label: "Overview" },
  { href: "/account", label: "Account" },
  { href: "/team", label: "Team" },
  { href: "/subscription", label: "Subscription Plans" },
  { href: "/compute", label: "Buy Compute Packs" },
  { href: "/statistics", label: "Usage Statistics" },
  { href: "/billing", label: "Billing" },
  { href: "/promo", label: "Promo" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 w-48 h-full bg-white border-r border-gray-200 p-4">
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2 text-sm rounded-md transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700 font-medium" 
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
} 