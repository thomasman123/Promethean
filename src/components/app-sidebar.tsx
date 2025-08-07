"use client"

import * as React from "react"
import {
  BarChart3,
  Bot,
  ChevronDown,
  Command,
  LifeBuoy,
  MegaphoneIcon,
  Send,
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
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  accounts: [
    {
      id: "1",
      name: "Acme Inc",
      plan: "Enterprise",
    },
    {
      id: "2", 
      name: "TechCorp",
      plan: "Professional",
    },
    {
      id: "3",
      name: "StartupXYZ", 
      plan: "Starter",
    },
  ],
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
      url: "#",
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
      url: "#",
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
  const [selectedAccount, setSelectedAccount] = React.useState(data.accounts[0])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Select value={selectedAccount.id} onValueChange={(value) => {
              const account = data.accounts.find(acc => acc.id === value)
              if (account) setSelectedAccount(account)
            }}>
              <SelectTrigger className="h-auto p-0 border-0 shadow-none">
                <SidebarMenuButton size="lg" className="w-full">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{selectedAccount.name}</span>
                    <span className="truncate text-xs">{selectedAccount.plan}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </SelectTrigger>
              <SelectContent>
                {data.accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="grid text-left text-sm leading-tight">
                      <span className="truncate font-medium">{account.name}</span>
                      <span className="truncate text-xs text-muted-foreground">{account.plan}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
