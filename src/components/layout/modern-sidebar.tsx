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
  Check,
  Sword,
  Sun,
  Moon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@supabase/ssr"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useAccountsCache } from "@/hooks/use-accounts-cache"
import { useDashboard } from "@/lib/dashboard-context"

interface NavItem {
  name: string
  href: string
  icon: any
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigationSections: NavSection[] = [
  {
    title: "DASHBOARD",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Playground", href: "/playground", icon: Palette },
    ]
  },
  {
    title: "DATA",
    items: [
      { name: "Follow ups", href: "/follow-ups", icon: Calendar },
      { name: "Appointments/Discoveries", href: "/update-data/appointments-discoveries", icon: Calendar },
      { name: "Payment Plans", href: "/update-data/payment-plans", icon: RefreshCw },
    ]
  },
]

export function ModernSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user: effectiveUser } = useEffectiveUser()
  const { accounts } = useAccountsCache(effectiveUser?.id)
  const { selectedAccountId, setSelectedAccountId } = useDashboard()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load collapsed state and theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed")
    if (saved !== null) {
      setIsCollapsed(saved === "true")
    }
    
    const theme = localStorage.getItem('theme')
    setIsDarkMode(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches))
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    localStorage.setItem('selectedAccountId', accountId)
    window.dispatchEvent(new CustomEvent('accountChanged', { detail: { accountId } }))
    // Refresh the page to reload data with new account
    window.location.reload()
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
      {/* Promethean Branding Section */}
      <div className={cn("p-4 border-b border-border", isCollapsed && "px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors",
                isCollapsed && "justify-center"
              )}
            >
              <Sword className="h-4 w-4 text-primary" />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-semibold flex-1 text-left">Promethean</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isCollapsed ? "end" : "start"} className="w-56">
            {/* Account Selector as First Item */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Building2 className="mr-2 h-4 w-4" />
                <span>Switch Account</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => handleAccountChange(account.id)}
                    className="flex items-center justify-between"
                  >
                    <span>{account.name}</span>
                    {selectedAccountId === account.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            
            {/* Account & Settings */}
            <DropdownMenuItem onClick={() => router.push("/account/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account/ghl-connection")}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>GHL Connection</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account/meta-ads-connection")}>
              <Rocket className="mr-2 h-4 w-4" />
              <span>Meta Ads Connection</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/account/team")}>
              <Users className="mr-2 h-4 w-4" />
              <span>Team</span>
            </DropdownMenuItem>
            
            {currentUserRole === 'admin' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
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
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title}>
            {/* Section Header */}
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </h4>
              </div>
            )}
            
            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-[13px] font-normal",
                      active 
                        ? "bg-muted text-foreground" 
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!isCollapsed && (
                      <span>{item.name}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section: What's New, Theme Toggle, Collapse */}
      <div className="border-t border-border">
        {/* What's New Notification */}
        {!isCollapsed && (
          <div className="p-3 mx-3 mt-3 mb-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
              What's new
            </div>
            <div className="text-xs font-medium text-foreground">
              Modern Sidebar Layout
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className={cn("p-3 flex items-center justify-between gap-2", isCollapsed && "flex-col")}>
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

