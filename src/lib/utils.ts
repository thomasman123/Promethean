import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format seconds into human-readable time format
 * Examples:
 * - 45 -> "45 seconds"
 * - 3661 -> "1 hour, 1 minute" 
 * - 90061 -> "1 day, 1 hour"
 * - 3814351 -> "44 days, 3 hours"
 */
export function formatSecondsToTime(seconds: number): string {
  if (seconds < 0) {
    return `${formatSecondsToTime(Math.abs(seconds))} ago`;
  }
  
  if (seconds === 0) {
    return "0 seconds";
  }
  
  const units = [
    { name: "day", value: 86400 },
    { name: "hour", value: 3600 },
    { name: "minute", value: 60 },
    { name: "second", value: 1 }
  ];
  
  const parts: string[] = [];
  let remaining = Math.floor(seconds);
  
  for (const unit of units) {
    if (remaining >= unit.value) {
      const count = Math.floor(remaining / unit.value);
      remaining = remaining % unit.value;
      
      const unitName = count === 1 ? unit.name : `${unit.name}s`;
      parts.push(`${count} ${unitName}`);
      
      // Only show top 2 most significant units for readability
      if (parts.length === 2) break;
    }
  }
  
  return parts.join(", ");
}
