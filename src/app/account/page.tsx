"use client"

import { TopBar } from "@/components/layout/topbar"
import { LayoutWrapper, useLayout } from "@/components/layout/layout-wrapper"
import { GradientCard } from "@/components/layout/gradient-card"

function AccountContent() {
  const { isModern } = useLayout()

  return (
    <>
      {!isModern && <TopBar />}
      
      <main className={isModern ? "page-fade-in" : "pt-16 p-6"}>
        {isModern ? (
          <GradientCard>
            <h1 className="text-2xl font-bold mb-4">Account</h1>
            <p className="text-muted-foreground">Account settings and preferences</p>
          </GradientCard>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Account</h1>
            <p className="text-muted-foreground">Account settings and preferences</p>
          </>
        )}
      </main>
    </>
  )
}

export default function AccountPage() {
  return (
    <LayoutWrapper>
      <AccountContent />
    </LayoutWrapper>
  )
} 