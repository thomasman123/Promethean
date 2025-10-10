"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  RefreshCw,
  Settings,
  Users,
  Rocket,
  Palette,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  User,
  ChevronDown,
  Building2,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@supabase/ssr"
import { useEffectiveUser } from "@/hooks/use-effective-user"

interface NavItem {
  name: string
  href: string
  icon: any
}

const navigationItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Follow-ups", href: "/follow-ups", icon: Calendar },
  { name: "Update Data", href: "/update-data", icon: RefreshCw },
  { name: "Account", href: "/account", icon: Settings },
  { name: "Team", href: "/account/team", icon: Users },
  { name: "Marketing", href: "/marketing", icon: Rocket },
  { name: "Playground", href: "/playground", icon: Palette },
]

interface ModernSidebarProps {
  accountName?: string
}

export function ModernSidebar({ accountName = "Account" }: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user: effectiveUser } = useEffectiveUser()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
  }, [])

  // Get current user role
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (response.ok) {
          const data = await response.json()
          setCurrentUserRole(data.user?.role || null)
        }
      } catch (error) {
        console.error('Failed to get current user:', error)
      }
    }
    getCurrentUser()
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebarCollapsed", newState.toString())
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-background border-r border-border transition-all duration-300 z-40 flex flex-col",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Account Section */}
      <div className={cn("p-4 border-b border-border", isCollapsed && "px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors",
                isCollapsed && "justify-center"
              )}
            >
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {accountName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{accountName}</p>
                    <p className="text-xs text-muted-foreground">Account</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "end" : "start"} className="w-56">
            <DropdownMenuItem onClick={() => router.push("/account/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            {currentUserRole === 'admin' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin")}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Settings</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-accent/50",
                active && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={cn("h-5 w-5", !active && "text-muted-foreground", active && "text-primary-foreground")} />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className={cn("p-4 border-t border-border", isCollapsed && "px-2")}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className={cn("w-full", isCollapsed && "px-0")}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

