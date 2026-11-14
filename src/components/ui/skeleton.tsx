import * as React from "react"

import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-[6px] bg-mac-fill-secondary", className)}
      {...props}
    />
  )
}

export { Skeleton }
