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
  X,
  Target,
  CheckCircle2,
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
import { Badge } from "@/components/ui/badge"
import { createBrowserClient } from "@supabase/ssr"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useAccountsCache } from "@/hooks/use-accounts-cache"
import { useDashboard } from "@/lib/dashboard-context"
import { AccountSettingsModal } from "./account-settings-modal"
import { AdminSettingsModal } from "./admin-settings-modal"

interface NavItem {
  name: string
  href: string
  icon: any
}

interface NavSection {
  title: string
  items: NavItem[]
  requireModerator?: boolean
}

const navigationSections: NavSection[] = [
  {
    title: "DASHBOARD",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Canvas", href: "/canvas", icon: Palette },
      { name: "KPIs", href: "/account/kpis", icon: Target },
    ]
  },
  {
    title: "DATA",
    items: [
      { name: "Complete Data", href: "/update-data/complete", icon: CheckCircle2 },
      { name: "Follow ups", href: "/update-data/follow-ups", icon: Calendar },
      { name: "Appointments/Discoveries", href: "/update-data/appointments-discoveries", icon: Calendar },
      { name: "Payment Plans", href: "/update-data/payment-plans", icon: RefreshCw },
    ]
  },
  {
    title: "MODERATION",
    items: [
      { name: "Moderate Data", href: "/update-data/moderate", icon: Shield },
    ],
    requireModerator: true // Only show for moderators/admins
  },
]

interface Notification {
  id: string
  title: string
  href?: string
}

export function ModernSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsModalTab, setSettingsModalTab] = useState("account")
  const [adminSettingsOpen, setAdminSettingsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'Modern Sidebar Layout', href: '/dashboard' }
  ])
  const [overdueCount, setOverdueCount] = useState(0)
  const [hasModeratorAccess, setHasModeratorAccess] = useState(false)
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

  // Load overdue count
  useEffect(() => {
    if (effectiveUser) {
      loadOverdueCount()
      // Refresh every 5 minutes
      const interval = setInterval(loadOverdueCount, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [effectiveUser])

  // Check moderator access
  useEffect(() => {
    if (effectiveUser && selectedAccountId) {
      checkModeratorAccess()
    }
  }, [effectiveUser, selectedAccountId])

  const loadOverdueCount = async () => {
    try {
      const response = await fetch('/api/notifications/overdue')
      if (response.ok) {
        const data = await response.json()
        setOverdueCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error loading overdue count:', error)
    }
  }

  const checkModeratorAccess = async () => {
    if (!effectiveUser || !selectedAccountId) {
      setHasModeratorAccess(false)
      return
    }
    
    try {
      // Check if admin (global access)
      if (currentUserRole === 'admin') {
        setHasModeratorAccess(true)
        return
      }

      // Check account-specific moderator access
      const { data: access } = await supabase
        .from('account_access')
        .select('role')
        .eq('user_id', effectiveUser.id)
        .eq('account_id', selectedAccountId)
        .in('role', ['admin', 'moderator'])
        .single()
      
      setHasModeratorAccess(!!access)
    } catch (error) {
      console.error('Error checking moderator access:', error)
      setHasModeratorAccess(false)
    }
  }

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

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleNotificationClick = (notification: Notification) => {
    if (notification.href) {
      router.push(notification.href)
    }
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
        "fixed left-0 top-0 h-screen bg-background transition-all duration-300 z-40 flex flex-col",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Promethean Branding Section */}
      <div className={cn("p-4", isCollapsed && "px-2")}>
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
            <DropdownMenuItem onClick={() => {
              setSettingsModalTab("account")
              setSettingsModalOpen(true)
            }}>
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
            <DropdownMenuItem onClick={() => {
              setSettingsModalTab("team")
              setSettingsModalOpen(true)
            }}>
              <Users className="mr-2 h-4 w-4" />
              <span>Team</span>
            </DropdownMenuItem>
            
            {currentUserRole === 'admin' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setAdminSettingsOpen(true)}>
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
        {navigationSections.filter(section => !section.requireModerator || hasModeratorAccess).map((section, sectionIndex) => (
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
                const showOverdueBadge = item.href === "/update-data/complete" && overdueCount > 0

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-200 text-[13px] font-normal relative",
                      active 
                        ? "bg-muted text-foreground" 
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1">{item.name}</span>
                        {showOverdueBadge && (
                          <Badge 
                            variant="destructive" 
                            className="h-5 px-1.5 text-[10px] font-semibold ml-auto"
                          >
                            {overdueCount > 99 ? '99+' : overdueCount}
                          </Badge>
                        )}
                      </>
                    )}
                    {isCollapsed && showOverdueBadge && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
                        {overdueCount > 9 ? '9+' : overdueCount}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section: What's New, Theme Toggle, Collapse */}
      <div>
        {/* What's New Notifications */}
        {!isCollapsed && notifications.length > 0 && (
          <div className="p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-medium px-3">
              What's new
            </div>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="group relative p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 hover:border-border transition-all cursor-pointer"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDismissNotification(notification.id)
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="text-xs font-medium text-foreground pr-6">
                  {notification.title}
                </div>
              </div>
            ))}
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

      {/* Account Settings Modal */}
      <AccountSettingsModal
        open={settingsModalOpen}
        onOpenChange={setSettingsModalOpen}
        defaultTab={settingsModalTab}
      />

      {/* Admin Settings Modal */}
      <AdminSettingsModal
        open={adminSettingsOpen}
        onOpenChange={setAdminSettingsOpen}
      />
    </div>
  )
}

