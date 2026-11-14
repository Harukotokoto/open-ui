"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

// A text field with icons, text or buttons inside it, e.g. a URL field
// with "https://" or a message field with a send button.
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-6 w-full min-w-0 items-center rounded-[6px] bg-mac-field text-mac-body shadow-[0_0_0_1px_var(--mac-field-border)] transition-[box-shadow] outline-none has-disabled:opacity-50",
        "has-[[data-slot=input-group-control]:focus-visible]:shadow-[0_0_0_1px_var(--mac-field-border),0_0_0_3.5px_color-mix(in_srgb,var(--mac-accent)_50%,transparent)]",
        "has-[[data-slot][aria-invalid=true]]:shadow-[0_0_0_3.5px_color-mix(in_srgb,var(--mac-red)_50%,transparent)]",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>[data-align=inline-end]]:[&>input]:pr-1 has-[>[data-align=inline-start]]:[&>input]:pl-1",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-1.5 text-mac-body text-mac-label-secondary select-none group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-2 has-[>button]:pl-0.5",
        "inline-end": "order-last pr-2 has-[>button]:pr-0.5",
        "block-start": "order-first w-full justify-start px-2 pt-1.5 [.border-b]:pb-1.5",
        "block-end": "order-last w-full justify-start px-2 pb-1.5 [.border-t]:pt-1.5",
      },
    },
    defaultVariants: { align: "inline-start" },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return
        event.currentTarget.parentElement?.querySelector<HTMLElement>("input, textarea")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva("shadow-none", {
  variants: {
    size: {
      xs: "h-5 gap-1 rounded-[4px] px-1.5 text-mac-subheadline [&>svg:not([class*='size-'])]:size-3",
      sm: "h-5 rounded-[5px] px-2",
      "icon-xs": "size-5 rounded-[4px] p-0",
      "icon-sm": "size-6 rounded-[5px] p-0",
    },
  },
  defaultVariants: { size: "xs" },
})

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("flex items-center gap-1.5 text-mac-body text-mac-label-secondary [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5", className)}
      {...props}
    />
  )
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn("h-full flex-1 rounded-none bg-transparent shadow-none focus-visible:shadow-none aria-invalid:shadow-none", className)}
      {...props}
    />
  )
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn("flex-1 resize-none rounded-none bg-transparent shadow-none focus-visible:shadow-none aria-invalid:shadow-none", className)}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea }
