"use client"

import { cn } from "@/lib/utils"
import { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from "react"
import Link from "next/link"

// Pill Container - For grouping elements in a pill shape
interface PillContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: "default" | "transparent"
}

export function PillContainer({ 
  children, 
  className, 
  variant = "default",
  ...props 
}: PillContainerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-full transition-all duration-200",
        variant === "default" && "bg-muted/50 backdrop-blur-sm border border-border/50",
        variant === "transparent" && "bg-transparent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Icon Button - For icon-only buttons with consistent styling
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
  size?: "sm" | "md" | "lg"
}

export function IconButton({ 
  children, 
  className, 
  isActive = false,
  size = "md",
  ...props 
}: IconButtonProps) {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5"
  }

  return (
    <button
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-200",
        "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
        sizeClasses[size],
        isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// Horizontal Dropdown - For horizontal dropdown menus
interface HorizontalDropdownProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  isOpen: boolean
}

export function HorizontalDropdown({ 
  children, 
  className,
  isOpen,
  ...props 
}: HorizontalDropdownProps) {
  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50",
        "rounded-full border bg-popover/95 backdrop-blur-sm shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        {children}
      </div>
    </div>
  )
}

// Dropdown Item - For items within a dropdown
interface DropdownItemProps {
  href: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}

export function DropdownItem({ 
  href, 
  icon, 
  children, 
  className 
}: DropdownItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs cursor-pointer",
        "hover:bg-accent transition-colors whitespace-nowrap",
        className
      )}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span>{children}</span>
    </Link>
  )
}

// Glass Card - For content containers with glassmorphism
interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: "default" | "scrolled"
}

export function GlassCard({ 
  children, 
  className,
  variant = "default",
  ...props 
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "backdrop-blur-sm border transition-all duration-200",
        variant === "default" && "bg-muted/50 border-border/50",
        variant === "scrolled" && "bg-background/80 backdrop-blur-md border-b",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Page Layout - Standard page structure
interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {children}
    </div>
  )
}

// Page Content - Main content area with proper padding
interface PageContentProps {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <main className={cn("pt-16 p-6", className)}>
      {children}
    </main>
  )
} 