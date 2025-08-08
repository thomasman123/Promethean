"use client"

import * as React from "react"
import {
  BarChart3,
  Bot,
  Command,
  LifeBuoy,
  MegaphoneIcon,
  Send,
  Settings,
  Shield,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"

const staticData = {
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: BarChart3,
      isActive: true,
      items: [
        {
          title: "Appointments",
          url: "#",
        },
        {
          title: "Discoveries",
          url: "#",
        },
        {
          title: "Dials",
          url: "#",
        },
      ],
    },
    {
      title: "Ads",
      url: "/ads",
      icon: MegaphoneIcon,
      items: [
        {
          title: "Setup",
          url: "#",
        },
        {
          title: "Campaigns",
          url: "#",
        },
      ],
    },
    {
      title: "AI Tools",
      url: "/ai-tools",
      icon: Bot,
      items: [
        {
          title: "Call Analysis",
          url: "#",
        },
        {
          title: "KPI Breakdown",
          url: "#",
        },
      ],
    },
    {
      title: "Admin",
      url: "/admin",
      icon: Shield,
      items: [
        {
          title: "Manage Accounts",
          url: "/admin/manage-accounts",
        },
      ],
    },
    {
      title: "Account",
      url: "/account",
      icon: Settings,
      items: [
        {
          title: "CRM Connection",
          url: "/account/crm-connection",
        },
        {
          title: "Calendar Mapping",
          url: "/account/calendar-mapping",
        },
        {
          title: "Team Members",
          url: "/account/team-members",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading, selectedAccountId, setSelectedAccountId, getAvailableAccounts, isAdmin, isModerator } = useAuth()
  const availableAccounts = getAvailableAccounts()
  const selectedAccount = availableAccounts.find(acc => acc.id === selectedAccountId) || availableAccounts[0]

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    return staticData.navMain.filter(item => {
      // Hide Admin section for non-admin users
      if (item.title === 'Admin') {
        return isAdmin()
      }
      
      // Hide Account section for setters and sales reps
      if (item.title === 'Account') {
        return isModerator() // Only admin and moderator can see Account section
      }
      
      // Hide certain features based on role
      if (item.title === 'Ads') {
        return isModerator() // Only admin and moderator can manage ads
      }
      
      return true // Show Dashboard and AI Tools to everyone
    })
  }

  if (loading) {
    return (
      <Sidebar variant="inset" {...props}>
        <div className="p-4">Loading...</div>
      </Sidebar>
    )
  }

  if (!user) {
    return null
  }

  const userData = {
    name: user.profile?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    avatar: user.profile?.avatar_url || '',
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {availableAccounts.length > 1 ? (
              <Select 
                value={selectedAccountId || ''} 
                onValueChange={(value) => setSelectedAccountId(value)}
              >
                <SelectTrigger className="h-auto p-2 border-0 shadow-none bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent focus:ring-0 focus:ring-offset-0">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                    <span className="truncate font-medium">{selectedAccount?.name || 'No Account'}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {selectedAccount?.description || 'Account'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent align="center" sideOffset={8}>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-6 items-center justify-center rounded-md">
                          <Command className="size-3" />
                        </div>
                        <div className="grid text-left text-sm leading-tight">
                          <span className="truncate font-medium">{account.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {account.description || 'Account'}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 p-2">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{selectedAccount?.name || 'No Account'}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {selectedAccount?.description || 'Account'}
                  </span>
                </div>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getFilteredNavItems()} />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
