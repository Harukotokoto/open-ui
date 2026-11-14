"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// A button that stays pressed, like Bold in TextEdit's format bar.
const toggleVariants = cva(
  "group/toggle inline-flex cursor-default items-center justify-center gap-1 rounded-[6px] text-mac-body font-medium whitespace-nowrap text-mac-label transition-colors outline-none select-none hover:bg-mac-fill-tertiary focus-visible:mac-focus-ring data-disabled:pointer-events-none data-disabled:text-mac-label-tertiary data-pressed:bg-mac-fill-primary data-pressed:hover:bg-mac-fill-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "bg-mac-control hover:bg-mac-control-pressed data-pressed:bg-mac-control-pressed data-pressed:text-mac-accent",
      },
      size: {
        default: "h-6 min-w-6 px-2",
        sm: "h-5 min-w-5 rounded-[5px] px-1.5 text-mac-subheadline [&_svg:not([class*='size-'])]:size-3",
        lg: "h-7 min-w-7 rounded-full px-3 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Toggle({ className, variant = "default", size = "default", ...props }: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
}

export { Toggle, toggleVariants }
