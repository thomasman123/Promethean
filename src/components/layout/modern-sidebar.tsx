"use client"

import { cn } from "@/lib/utils"
import { 
  Sword, 
  Home, 
  RefreshCw, 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  ChevronDown, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  Building2, 
  Palette, 
  FileText, 
  Shield, 
  TrendingUp,
  ChevronRight,
  Bell,
  Plus
} from "lucide-react"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { DatePicker } from "@/components/ui/date-picker"
import { ViewsManager } from "@/components/dashboard/views-manager"
import { AddWidgetModal, WidgetConfig } from "@/components/dashboard/add-widget-modal"
import { AdminSettingsModal } from "./admin-settings-modal"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { useAccountsCache } from "@/hooks/use-accounts-cache"
import { FollowUpNotifications } from "./follow-up-notifications"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LocationCountrySelector } from "@/components/data/location-country-selector"
import { ConnectedGithubGlobe } from "@/components/data/connected-github-globe"
import { ApplyLocationButton } from "@/components/data/location-apply-button"
import { NavigationModeToggle } from "./navigation-mode-toggle"

interface Account {
  id: string
  name: string
  description?: string
}

interface ModernSidebarProps {
  onAddWidget?: (widget: WidgetConfig) => void
}

export function ModernSidebar({ onAddWidget }: ModernSidebarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview', 'update-data', 'account'])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false)
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [hasSettingsAccess, setHasSettingsAccess] = useState(false)
  const [appointmentsTab, setAppointmentsTab] = useState<'appointments' | 'discoveries'>('appointments')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { dateRange, setDateRange, selectedAccountId, setSelectedAccountId, setCurrentViewId, currentViewId } = useDashboard()
  const { user: effectiveUser, loading: effectiveUserLoading } = useEffectiveUser()
  const { accounts, loading: accountsLoading, refreshAccounts } = useAccountsCache(effectiveUser?.id)

  const showDashboardControls = pathname === "/dashboard"

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    if (effectiveUser && !effectiveUserLoading) {
      getCurrentUser()
      checkImpersonation()
    }
  }, [effectiveUser, effectiveUserLoading])

  useEffect(() => {
    if (accounts.length > 0 && !accountsLoading) {
      const savedAccountId = localStorage.getItem('selectedAccountId')
      
      if (savedAccountId && accounts.find((a: Account) => a.id === savedAccountId)) {
        if (selectedAccountId !== savedAccountId) {
          setSelectedAccountId(savedAccountId)
        }
      } else if (!selectedAccountId && accounts.length > 0) {
        setSelectedAccountId(accounts[0].id)
        localStorage.setItem('selectedAccountId', accounts[0].id)
      }
    }
  }, [accounts, accountsLoading, selectedAccountId, setSelectedAccountId])

  useEffect(() => {
    const checkSettingsAccess = async () => {
      if (!effectiveUser || !selectedAccountId) {
        setHasSettingsAccess(false)
        return
      }

      if (effectiveUser.role === 'admin') {
        setHasSettingsAccess(true)
        return
      }

      try {
        const { data: access } = await supabase
          .from('account_access')
          .select('role')
          .eq('user_id', effectiveUser.id)
          .eq('account_id', selectedAccountId)
          .eq('is_active', true)
          .single()

        setHasSettingsAccess(access && ['admin', 'moderator'].includes(access.role))
      } catch (error) {
        setHasSettingsAccess(false)
      }
    }

    checkSettingsAccess()
  }, [effectiveUser, selectedAccountId, supabase])

  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.user?.id || "")
        setCurrentUserRole(data.user?.role || null)
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
  }

  const checkImpersonation = async () => {
    try {
      const response = await fetch('/api/auth/impersonation')
      const data = await response.json()
      setIsImpersonating(!!data.impersonatedUserId)
    } catch (error) {
      console.error('Failed to check impersonation:', error)
    }
  }

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId)
    localStorage.setItem('selectedAccountId', accountId)
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleViewChange = (viewId: string) => {
    setCurrentViewId(viewId)
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const handleAppointmentsTabChange = (tab: 'appointments' | 'discoveries') => {
    setAppointmentsTab(tab)
    window.dispatchEvent(new CustomEvent('appointmentsTabChanged', { detail: { tab } }))
  }

  const navSections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Home,
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/playground", label: "Playground", icon: Palette }
      ]
    },
    {
      id: 'update-data',
      label: 'Update Data',
      icon: RefreshCw,
      items: [
        { href: "/update-data", label: "Overview", icon: FileText },
        { href: "/update-data/appointments-discoveries", label: "Appointments", icon: Calendar },
        { href: "/update-data/follow-ups", label: "Follow Ups", icon: Users },
        { href: "/update-data/payment-plans", label: "Payment Plans", icon: CreditCard }
      ]
    },
    {
      id: 'account',
      label: 'Account',
      icon: Settings,
      items: [
        ...(hasSettingsAccess ? [{ href: "/account/settings", label: "Settings", icon: Settings }] : []),
        { href: "/account/ghl-connection", label: "GHL Connection", icon: Shield },
        { href: "/account/meta-ads-connection", label: "Meta Ads", icon: TrendingUp },
        { href: "/account/team", label: "Team", icon: Users }
      ]
    }
  ]

  return (
    <>
      <div className={cn(
        "fixed left-0 h-screen w-64 border-r bg-background flex flex-col z-40 transition-all",
        isImpersonating ? "top-10" : "top-0"
      )}>
        {/* Header - Logo & Account Selector */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Sword className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Promethean</span>
          </div>

          {/* Account Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-between h-9"
                disabled={accounts.length === 0}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-sm">
                    {accountsLoading
                      ? "Loading..." 
                      : accounts.length === 0
                      ? "No accounts"
                      : accounts.find(a => a.id === selectedAccountId)?.name || "Select Account"
                    }
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {accounts.map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  onSelect={() => handleAccountChange(account.id)}
                  className={selectedAccountId === account.id ? 'font-semibold' : ''}
                >
                  {account.name}
                </DropdownMenuItem>
              ))}
              {accounts.length > 0 && (
                <>
                  <div className="h-px bg-border mx-1 my-1" />
                  <DropdownMenuItem
                    onSelect={() => refreshAccounts()}
                    className="text-muted-foreground"
                    disabled={accountsLoading}
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", accountsLoading && "animate-spin")} />
                    {accountsLoading ? "Refreshing..." : "Refresh accounts"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navSections.map((section) => {
            const SectionIcon = section.icon
            const isExpanded = expandedSections.includes(section.id)
            const hasActiveChild = section.items.some(item => 
              pathname === item.href || pathname.startsWith(item.href + "/")
            )

            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    hasActiveChild
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon className="h-4 w-4" />
                    <span>{section.label}</span>
                  </div>
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon
                      const isActive = pathname === item.href
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground font-medium"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom Section - User & Settings */}
        <div className="border-t p-3 space-y-2">
          {/* Navigation Mode Toggle */}
          <NavigationModeToggle />

          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDarkMode}
            className="w-full justify-start gap-3"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="text-sm">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </Button>

          {/* Follow-up Notifications */}
          <div className="w-full">
            <FollowUpNotifications />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback className="bg-muted text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-xs text-muted-foreground">
                    {effectiveUser?.email?.split('@')[0] || 'User'}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {currentUserRole === 'admin' && (
                <>
                  <DropdownMenuItem 
                    onClick={() => setShowAdminSettingsModal(true)}
                    className="cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Settings</span>
                  </DropdownMenuItem>
                  <div className="h-px bg-border my-1" />
                </>
              )}
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Top Bar for Dashboard Controls - Fixed at top when sidebar is active */}
      {showDashboardControls && (
        <div className={cn(
          "fixed left-64 right-0 z-30 flex items-center justify-end gap-3 px-6 py-3 bg-background/80 backdrop-blur-md border-b",
          isImpersonating ? "top-10" : "top-0"
        )}>
          {/* Location Globe */}
          {pathname === "/dashboard" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">Location</Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[96vw]" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Location</DialogTitle>
                  <DialogDescription>Interactive globe. Drag to rotate. Click to highlight. Use the list to multi-select.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 h-[620px] w-full">
                  <LocationCountrySelector className="md:col-span-2 h-full" />
                  <div className="md:col-span-3 h-full">
                    <ConnectedGithubGlobe />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4">
                  <Button variant="outline" size="sm" onClick={() => (document.querySelector('[data-state="open"][role="dialog"] button[aria-label="Close"]') as HTMLButtonElement)?.click?.()}>Cancel</Button>
                  <ApplyLocationButton />
                </div>
              </DialogContent>
            </Dialog>
          )}

          <DatePicker
            value={dateRange}
            onChange={setDateRange}
            applyMode
          />

          {pathname === "/dashboard" && (
            <>
              {selectedAccountId ? (
                <ViewsManager
                  accountId={selectedAccountId}
                  currentUserId={currentUserId}
                  currentViewId={currentViewId}
                  onViewChange={handleViewChange}
                />
              ) : (
                <div className="h-8 px-3 py-1 text-sm text-muted-foreground bg-muted rounded-md flex items-center">
                  Loading views...
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setShowAddWidgetModal(true)}
                disabled={!selectedAccountId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </>
          )}
        </div>
      )}

      {/* Update Data Page Controls */}
      {pathname.startsWith("/update-data") && (
        <div className={cn(
          "fixed left-64 right-0 z-30 flex items-center justify-end gap-3 px-6 py-3 bg-background/80 backdrop-blur-md border-b",
          isImpersonating ? "top-10" : "top-0"
        )}>
          {pathname === "/update-data" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => router.push("/update-data/appointments-discoveries")}
            >
              <Users className="h-4 w-4 mr-2" />
              All Appointments
            </Button>
          )}
          {pathname === "/update-data/appointments-discoveries" && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Calendar className="h-4 w-4 mr-2" />
                    {appointmentsTab === 'appointments' ? 'Appointments' : 'Discoveries'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleAppointmentsTabChange('appointments')}
                    className={appointmentsTab === 'appointments' ? 'font-semibold' : ''}
                  >
                    Appointments
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAppointmentsTabChange('discoveries')}
                    className={appointmentsTab === 'discoveries' ? 'font-semibold' : ''}
                  >
                    Discoveries
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => router.push("/update-data")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {pathname === "/dashboard" && onAddWidget && (
        <AddWidgetModal
          open={showAddWidgetModal}
          onOpenChange={setShowAddWidgetModal}
          onAddWidget={onAddWidget}
        />
      )}
      
      <AdminSettingsModal
        open={showAdminSettingsModal}
        onOpenChange={setShowAdminSettingsModal}
      />
    </>
  )
}

