"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  User,
  Users,
  CreditCard,
  Package,
  BarChart3,
  FileText,
  Tag,
} from "lucide-react"

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "Account", href: "/account", icon: User },
  { name: "Team", href: "/team", icon: Users },
  { name: "Subscription Plans", href: "/subscription", icon: CreditCard },
  { name: "Buy Compute Packs", href: "/compute", icon: Package },
  { name: "Usage Statistics", href: "/usage", icon: BarChart3 },
  { name: "Billing", href: "/billing", icon: FileText },
  { name: "Promo", href: "/promo", icon: Tag },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col sidebar-transparent">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-semibold">Promethean</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-secondary-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
} 