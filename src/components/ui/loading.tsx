import { cn } from "@/lib/utils"

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

  const textClasses = {
    sm: "text-sm",
    md: "text-lg", 
    lg: "text-xl"
  }

  return (
    <div className={cn(baseClasses[variant], className)}>
      <div className="text-center">
        <div className={cn("text-muted-foreground", textClasses[size])}>
          {text}
        </div>
      </div>
    </div>
  )
} 