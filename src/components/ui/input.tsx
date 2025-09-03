import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-xl text-foreground placeholder:text-muted-foreground transition-all duration-200 outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
  {
    variants: {
      variant: {
        default: "bg-background border border-input hover:border-border focus:ring-2 focus:ring-ring focus:border-transparent",
        filled: "bg-secondary/50 border border-transparent hover:bg-secondary/80 focus:ring-2 focus:ring-ring"
      },
      inputSize: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm", 
        lg: "h-12 px-5 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md"
    }
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
