"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  BarChart3, 
  Users, 
  Settings, 
  HelpCircle, 
  ChevronDown,
  Building2,
  CreditCard,
  FileText,
  TrendingUp
} from "lucide-react";

interface SidebarNavProps {
  className?: string;
}

interface NavItem {
  icon: React.ComponentType<any>;
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: "Overview", href: "/dashboard", active: true },
  { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: CreditCard, label: "Billing", href: "/billing", badge: "Pro" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
];

const accounts = [
  { id: "1", name: "Acme Corp", plan: "Enterprise", avatar: "/api/placeholder/32/32" },
  { id: "2", name: "TechStart Inc", plan: "Pro", avatar: "/api/placeholder/32/32" },
  { id: "3", name: "Growth Co", plan: "Starter", avatar: "/api/placeholder/32/32" },
];

export function SidebarNav({ className }: SidebarNavProps) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);

  return (
    <div className={`sidebar-bg h-screen w-64 flex flex-col border-r border-sidebar-border ${className}`}>
      {/* Account Selector */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between sidebar-text hover:bg-sidebar-accent p-3 h-auto"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedAccount.avatar} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                    {selectedAccount.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="font-medium text-sm">{selectedAccount.name}</div>
                  <div className="text-xs text-sidebar-accent-foreground">{selectedAccount.plan}</div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-accent-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {accounts.map((account) => (
              <DropdownMenuItem 
                key={account.id}
                onClick={() => setSelectedAccount(account)}
                className="flex items-center gap-3 p-3"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={account.avatar} />
                  <AvatarFallback>{account.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{account.name}</div>
                  <div className="text-xs text-muted-foreground">{account.plan}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Main Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Button
                  variant={item.active ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 sidebar-text hover:bg-sidebar-accent ${
                    item.active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-2 space-y-1">
        <Separator className="bg-sidebar-border mb-2" />
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.label}
              variant="ghost"
              className="w-full justify-start gap-3 sidebar-text hover:bg-sidebar-accent"
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Button>
          );
        })}
        
        {/* User Profile */}
        <div className="mt-4 p-3 rounded-lg bg-sidebar-accent">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/api/placeholder/32/32" />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                TH
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-sm sidebar-text">Thomas H.</div>
              <div className="text-xs text-sidebar-accent-foreground">Admin</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 