import * as React from "react"

import { cn } from "@/lib/utils"

// A key cap for keyboard shortcuts: ⌘, ⇧, ⌥, ⌃ and letters.
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-0.5 rounded-[5px] bg-mac-control px-1 font-sans text-[11px] font-medium text-mac-label-secondary shadow-[inset_0_-1px_0_rgb(0_0_0/0.08)] select-none dark:shadow-[inset_0_-1px_0_rgb(0_0_0/0.3)] in-data-[slot=tooltip-content]:bg-mac-fill-primary [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
