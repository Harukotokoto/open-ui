import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ListFilterIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// A macOS search field: a capsule with a magnifying glass.
// `default` sits in content, `glass` matches toolbar capsules and `filled`
// is the sidebar search field of System Settings. FilterField has the same
// styles with a filter symbol, for narrowing a list in place.
const searchFieldVariants = cva(
  "group/search-field relative flex min-w-0 shrink-0 items-center gap-0.5 rounded-full text-mac-body text-mac-label has-[input:focus-visible]:mac-focus-ring has-[input:disabled]:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-mac-field shadow-[0_0_0_1px_var(--mac-field-border)]",
        glass: "glass-surface",
        filled:
          "bg-mac-fill-primary shadow-[0_0_0_1px_rgb(0_0_0/0.04)] dark:bg-white/13 dark:shadow-[0_0_0_1px_rgb(0_0_0/0.5)]",
      },
      size: {
        sm: "h-5 pl-1.5 text-mac-subheadline [&_[data-slot=search-field-icon]]:size-3",
        default: "h-6 pl-2 [&_[data-slot=search-field-icon]]:size-3.5",
        lg: "h-7 pl-[9px] [&_[data-slot=search-field-icon]]:size-[15px]",
        xl: "h-9 pl-3 [&_[data-slot=search-field-icon]]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type SearchFieldProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof searchFieldVariants>

function Field({
  className,
  variant = "default",
  size = "default",
  icon: Icon,
  ...props
}: SearchFieldProps & { icon: typeof SearchIcon }) {
  return (
    <div
      data-slot="search-field"
      data-size={size}
      className={cn(searchFieldVariants({ variant, size }), className)}
    >
      <Icon
        data-slot="search-field-icon"
        aria-hidden="true"
        className="pointer-events-none shrink-0 text-mac-label-secondary"
        strokeWidth={2.25}
      />
      <input
        type="search"
        data-slot="search-field-input"
        className="h-full w-full min-w-0 bg-transparent pr-2 pl-1 text-[1em] font-medium text-mac-label outline-none placeholder:text-mac-label-secondary dark:placeholder:text-white/50 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
    </div>
  )
}

function SearchField({ placeholder = "Search", ...props }: SearchFieldProps) {
  return <Field icon={SearchIcon} placeholder={placeholder} {...props} />
}

// Narrows what a list shows as you type, like the field under Xcode's
// navigator or Mail's mailbox list.
function FilterField({ placeholder = "Filter", ...props }: SearchFieldProps) {
  return <Field icon={ListFilterIcon} placeholder={placeholder} {...props} />
}

export { FilterField, SearchField, searchFieldVariants }
