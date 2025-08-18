"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { PageHeader } from "@/components/page-header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
} 