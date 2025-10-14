import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface LoadingProps {
  className?: string
  text?: string
  size?: "sm" | "md" | "lg"
  variant?: "page" | "inline" | "card"
  showProgress?: boolean
}

export function Loading({ 
  className, 
  text = "Loading your data", 
  size = "md",
  variant = "page",
  showProgress = false
}: LoadingProps) {
  const baseClasses = {
    page: "flex items-center justify-center min-h-[300px]",
    inline: "flex items-center justify-center p-4",
    card: "p-8 text-center"
  }

  const spinnerSizes = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3", 
    lg: "w-16 h-16 border-4"
  }

  const containerSizes = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-18 h-18"
  }

  const textClasses = {
    sm: "text-xs",
    md: "text-sm", 
    lg: "text-base"
  }

  return (
    <div className={cn(baseClasses[variant], className)}>
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className={cn("inline-flex items-center justify-center rounded-full bg-primary/10", containerSizes[size])}>
            <div className={cn(
              "border-primary border-t-transparent rounded-full animate-spin",
              spinnerSizes[size]
            )} />
          </div>
          {text && (
            <>
              <div className={cn("font-semibold", size === "lg" ? "text-lg" : "text-base")}>
                {text}
              </div>
              <p className={cn("text-muted-foreground", textClasses[size])}>
                This will just take a moment...
              </p>
            </>
          )}
        </div>
        {showProgress && (
          <Progress value={66} className="h-2" />
        )}
      </div>
    </div>
  )
} 