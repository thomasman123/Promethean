import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-2xl transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card backdrop-blur-xl border border-border/50 dark:border-border/50",
        elevated: "bg-card shadow-lg",
        outlined: "bg-transparent border border-border",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-10",
      },
      interactive: {
        true: "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "lg",
      interactive: false,
    },
  }
)

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, variant, padding, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, padding, interactive }), className)}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-6", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Additional Surface component from your original design
const surfaceVariants = cva(
  "rounded-lg transition-all duration-200",
  {
    variants: {
      variant: {
        primary: "bg-secondary/50 dark:bg-secondary/20",
        secondary: "bg-muted/30 dark:bg-muted/10",
      }
    },
    defaultVariants: {
      variant: "primary",
    },
  }
)

const Surface = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof surfaceVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(surfaceVariants({ variant }), "p-4", className)}
    {...props}
  />
))
Surface.displayName = "Surface"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
  Surface,
  surfaceVariants,
}
