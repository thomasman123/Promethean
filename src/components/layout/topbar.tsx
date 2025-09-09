"use client"

import { cn } from "@/lib/utils"
import { Sword, Home, RefreshCw, Settings, Sun, Moon, LogOut, ChevronDown, LayoutDashboard, Database, Calendar, Users, CreditCard, Building2, Palette, Plus, FileText, Shield } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { TablesManager } from "@/components/data-view/tables-manager"
import { RoleFilterDropdown, type RoleFilter } from "@/components/data-view/role-filter"
import { AddWidgetModal, WidgetConfig } from "@/components/dashboard/add-widget-modal"
import { AdminSettingsModal } from "./admin-settings-modal"
import { useDashboard } from "@/lib/dashboard-context"
import { useEffectiveUser } from "@/hooks/use-effective-user"
import { FollowUpNotifications } from "./follow-up-notifications"

interface Account {
  id: string
  name: string
  description?: string
}

interface TopBarProps {
  onAddWidget?: (widget: WidgetConfig) => void
}

export function TopBar({ onAddWidget }: TopBarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentTableId, setCurrentTableId] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('both')
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false)
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [appointmentsTab, setAppointmentsTab] = useState<'appointments' | 'discoveries'>('appointments')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { dateRange, setDateRange, selectedAccountId, setSelectedAccountId, setCurrentViewId, currentViewId } = useDashboard()
  const { user: effectiveUser, loading: effectiveUserLoading } = useEffectiveUser()

  // Show date/view controls only on dashboard and data-view pages
  const showDashboardControls = pathname === "/dashboard" || pathname === "/data-view"

  useEffect(() => {
    // Initialize dark mode from localStorage or system preference
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    // Load user accounts and get current user
    if (effectiveUser && !effectiveUserLoading) {
      loadUserAccounts()
      getCurrentUser()
      checkImpersonation()
    }
  }, [effectiveUser, effectiveUserLoading])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const getCurrentUser = async () => {
    try {
      // Get the real user (not effective user) for admin settings dropdown
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

  const loadUserAccounts = async () => {
    if (!effectiveUser) {
      console.log('🔍 [TopBar] No effective user, skipping account load')
      return
    }
    
    console.log('🔍 [TopBar] Loading accounts for effective user:', effectiveUser.id, 'role:', effectiveUser.role)
    
    try {
      // Use the API endpoint which properly handles impersonation
      console.log('🔍 [TopBar] Calling /api/accounts-simple...')
      const response = await fetch('/api/accounts-simple')
      const data = await response.json()
      
      console.log('🔍 [TopBar] API response status:', response.status)
      console.log('🔍 [TopBar] API response data:', data)
      
      if (!response.ok) {
        console.error('❌ [TopBar] Failed to load accounts:', data.error)
        setAccounts([])
        return
      }

      const accountsData = data.accounts || []
      console.log('✅ [TopBar] Setting accounts:', accountsData.length, 'accounts')
      console.log('🔍 [TopBar] Account details:', accountsData.map((a: Account) => ({ id: a.id, name: a.name })))
      setAccounts(accountsData)
      
      // Set first account as selected if none selected or current selection is not available
      if (accountsData.length > 0) {
        const savedAccountId = localStorage.getItem('selectedAccountId')
        console.log('🔍 [TopBar] Saved account ID from localStorage:', savedAccountId)
        
        if (savedAccountId && accountsData.find((a: Account) => a.id === savedAccountId)) {
          console.log('✅ [TopBar] Using saved account:', savedAccountId)
          setSelectedAccountId(savedAccountId)
        } else {
          console.log('✅ [TopBar] Using first account:', accountsData[0].id, accountsData[0].name)
          setSelectedAccountId(accountsData[0].id)
          localStorage.setItem('selectedAccountId', accountsData[0].id)
        }
      } else {
        console.log('⚠️ [TopBar] No accounts available')
      }
    } catch (error) {
      console.error('❌ [TopBar] Failed to load accounts:', error)
      setAccounts([])
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleViewChange = (viewId: string) => {
    setCurrentViewId(viewId)
  }

  const handleRoleFilterChange = (newRoleFilter: RoleFilter) => {
    setRoleFilter(newRoleFilter)
    // Dispatch custom event for data view page to listen to
    window.dispatchEvent(new CustomEvent('roleFilterChanged', { detail: { roleFilter: newRoleFilter } }))
  }

  const handleTableChange = (tableId: string | null) => {
    setCurrentTableId(tableId)
    // Dispatch custom event for data view page to listen to
    window.dispatchEvent(new CustomEvent('tableChanged', { detail: { tableId } }))
  }

  const handleAppointmentsTabChange = (tab: 'appointments' | 'discoveries') => {
    setAppointmentsTab(tab)
    // Dispatch custom event for the page to listen to
    window.dispatchEvent(new CustomEvent('appointmentsTabChanged', { detail: { tab } }))
  }

  const navItems = [
    { 
      href: "/", 
      label: "Overview", 
      icon: Home,
      dropdownItems: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/data-view", label: "Data View", icon: Database },
        { href: "/playground", label: "Playground", icon: Palette }
      ]
    },
    { 
      href: "/update-data", 
      label: "Update Data", 
      icon: RefreshCw,
      dropdownItems: [
        { href: "/update-data", label: "Overview", icon: FileText },
        { href: "/update-data/appointments-discoveries", label: "Appointments/Discoveries", icon: Calendar },
        { href: "/update-data/follow-ups", label: "Follow Ups", icon: Users },
        { href: "/update-data/payment-plans", label: "Payment Plans", icon: CreditCard }
      ]
    },
    { 
      href: "/account", 
      label: "Account", 
      icon: Settings,
      dropdownItems: [
        { href: "/account/ghl-connection", label: "GHL Connection", icon: Shield }
      ]
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

  const checkImpersonation = async () => {
    try {
      const response = await fetch('/api/auth/impersonation')
      const data = await response.json()
      setIsImpersonating(!!data.impersonatedUserId)
    } catch (error) {
      console.error('Failed to check impersonation:', error)
    }
  }

  return (
    <div className={cn(
      "fixed left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-200",
      isScrolled ? "bg-background/80 backdrop-blur-md border-b" : "bg-transparent",
      isImpersonating ? "top-10" : "top-0"
    )}>
      {/* Left section - Logo and Account Selector */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sword className="h-5 w-5 text-primary" />
        </div>

        {/* Account Dropdown - Updated to match new design */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              disabled={accounts.length === 0}
            >
              <Building2 className="h-4 w-4 mr-2" />
              {accounts.length === 0 
                ? "Loading..." 
                : accounts.find(a => a.id === selectedAccountId)?.name || "Select Account"
              }
              <ChevronDown className="h-4 w-4 ml-2" />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center section - Main Navigation with Icon Only */}
      <div className={cn(
        "absolute left-1/2 transform -translate-x-1/2",
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
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

      {/* Right section - Dashboard Controls, Dark mode toggle, Profile */}
      <div className="flex items-center gap-3">
        {/* Update Data Navigation Buttons */}
        {pathname.startsWith("/update-data") && (
          <>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
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
          </>
        )}

        {/* Date picker and Views - only show on appropriate pages */}
        {showDashboardControls && (
          <>
            <DatePicker
              value={dateRange}
              onChange={setDateRange}
            />
            
            {/* Show ViewsManager and Add Widget button on dashboard page */}
            {pathname === "/dashboard" && (
              <>
                <ViewsManager
                  accountId={selectedAccountId}
                  currentUserId={currentUserId}
                  currentViewId={currentViewId}
                  onViewChange={handleViewChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowAddWidgetModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              </>
            )}
            
            {/* Show RoleFilter and TablesManager on data-view page */}
            {pathname === "/data-view" && selectedAccountId && (
              <>
                <RoleFilterDropdown
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                />
                <TablesManager
                  accountId={selectedAccountId}
                  currentTableId={currentTableId}
                  onTableChange={handleTableChange}
                />
              </>
            )}
          </>
        )}

        {/* Follow-up Notifications */}
        <FollowUpNotifications />

        {/* Dark mode toggle - Updated to match new design */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          className="h-8 w-8"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background">
              <Avatar className="h-9 w-9 border border-border/50">
                <AvatarFallback className="bg-muted">U</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl border bg-popover/95 backdrop-blur-sm">
            {currentUserRole === 'admin' && (
              <>
                <DropdownMenuItem 
                  onClick={() => setShowAdminSettingsModal(true)}
                  className="cursor-pointer rounded-xl focus:bg-accent"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Settings</span>
                </DropdownMenuItem>
                <div className="h-px bg-border my-1" />
              </>
            )}
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="cursor-pointer rounded-xl focus:bg-accent"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Add Widget Modal */}
      {pathname === "/dashboard" && onAddWidget && (
        <AddWidgetModal
          open={showAddWidgetModal}
          onOpenChange={setShowAddWidgetModal}
          onAddWidget={onAddWidget}
        />
      )}
      
      {/* Admin Settings Modal */}
      <AdminSettingsModal
        open={showAdminSettingsModal}
        onOpenChange={setShowAdminSettingsModal}
      />
    </div>
  )
} 