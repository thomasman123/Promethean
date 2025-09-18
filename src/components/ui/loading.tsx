import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingProps {
  className?: string
  text?: string
  size?: "sm" | "md" | "lg"
  variant?: "page" | "inline" | "card"
}

export function Loading({ 
  className, 
  text = "Loading...", 
  size = "md",
  variant = "page" 
}: LoadingProps) {
  const baseClasses = {
    page: "flex items-center justify-center h-64",
    inline: "flex items-center justify-center p-4",
    card: "p-8 text-center"
  }

  const spinnerSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  const textClasses = {
    sm: "text-sm",
    md: "text-base", 
    lg: "text-lg"
  }

  return (
    <div className={cn(baseClasses[variant], className)}>
      <div className="flex flex-col items-center justify-center space-y-3">
        <Loader2 className={cn("animate-spin text-muted-foreground", spinnerSizes[size])} />
        <div className={cn("text-muted-foreground", textClasses[size])}>
          {text}
        </div>
      </div>
    </div>
  )
} 