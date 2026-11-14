import * as React from "react"

import { cn } from "@/lib/utils"

// The macOS spinning progress indicator: twelve spokes, each fainter than
// the one before, turning a spoke at a time.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-[spin_1s_steps(12)_infinite] text-mac-label-secondary", className)}
      {...props}
    >
      {Array.from({ length: 12 }, (_, index) => (
        <rect
          key={index}
          x="11"
          y="1.5"
          width="2"
          height="6"
          rx="1"
          fill="currentColor"
          opacity={1 - index * 0.07}
          transform={`rotate(${-index * 30} 12 12)`}
        />
      ))}
    </svg>
  )
}

export { Spinner }
