"use client"

import { LayoutWrapper } from "@/components/layout/layout-wrapper"
import { GradientCard } from "@/components/layout/gradient-card"

export default function AccountPage() {
  return (
    <LayoutWrapper>
      <div className="page-fade-in">
        <GradientCard title="Account" description="Account settings and preferences">
          <p className="text-muted-foreground">Manage your account settings here.</p>
        </GradientCard>
      </div>
    </LayoutWrapper>
  )
} 