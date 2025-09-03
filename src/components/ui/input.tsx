import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  variant?: "default" | "filled";
  inputSize?: "sm" | "md" | "lg";
}

function Input({ 
  className, 
  type, 
  variant = "default",
  inputSize = "md",
  ...props 
}: InputProps) {
  const variantStyles = {
    default: "bg-transparent border border-zinc-200 dark:border-zinc-700",
    filled: "bg-zinc-50 dark:bg-zinc-800/50 border border-transparent"
  };

  const sizeStyles = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-base"
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex w-full min-w-0 rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all outline-none",
        // Variant styles
        variantStyles[variant],
        // Size styles
        sizeStyles[inputSize],
        // Focus styles
        "focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent",
        // Hover styles
        "hover:border-zinc-300 dark:hover:border-zinc-600",
        // Disabled styles
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid styles
        "aria-invalid:ring-2 aria-invalid:ring-red-500 dark:aria-invalid:ring-red-400 aria-invalid:border-transparent",
        // File input styles
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-900 dark:file:text-white",
        className
      )}
      {...props}
    />
  )
}

export { Input }
