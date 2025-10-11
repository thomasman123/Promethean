"use client"

import { ModernLayout } from "./modern-layout"

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  // Modern layout is now the default for everyone - render immediately
  return <ModernLayout>{children}</ModernLayout>
}

