"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { CheckIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// cmdk keeps the highlighted item in view with scrollIntoView, which also
// scrolls the page when the palette sits below the fold (it runs on mount).
// Items and group headings scroll only their list instead.
function scrollInList(node: HTMLElement | null | undefined) {
  if (!node) return
  node.scrollIntoView = () => {
    const list = node.closest<HTMLElement>("[cmdk-list]")
    if (!list) return
    const inset = parseFloat(getComputedStyle(list).scrollPaddingTop) || 0
    const item = node.getBoundingClientRect()
    const box = list.getBoundingClientRect()
    if (item.top < box.top + inset) list.scrollTop -= box.top + inset - item.top
    else if (item.bottom > box.bottom - inset) list.scrollTop += item.bottom - box.bottom + inset
  }
}

function listScrollRef(ref: React.Ref<HTMLDivElement> | undefined, target = (node: HTMLDivElement): HTMLElement | null => node) {
  return (node: HTMLDivElement | null) => {
    if (node) scrollInList(target(node))
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }
}

// A command palette in the style of Spotlight: a large search field over a
// list of results; the highlighted one is filled with the accent color.
function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-[16px] bg-mac-window text-mac-body text-mac-label shadow-[0_0_0_1px_var(--mac-grid)]",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-[22%] translate-y-0 gap-0 overflow-hidden rounded-[26px] p-0 sm:max-w-[640px] [&_[data-slot=command]]:rounded-none [&_[data-slot=command]]:bg-transparent [&_[data-slot=command]]:shadow-none",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-12 shrink-0 items-center gap-2.5 border-b border-mac-grid px-4">
      <SearchIcon className="size-[18px] shrink-0 text-mac-label-secondary" strokeWidth={2.25} />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-full w-full bg-transparent text-[17px] text-mac-label outline-hidden placeholder:text-mac-label-tertiary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-80 scroll-py-1.5 overflow-x-hidden overflow-y-auto p-1.5 outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-mac-body text-mac-label-secondary", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      ref={listScrollRef(ref, (node) => node.querySelector<HTMLElement>("[cmdk-group-heading]"))}
      data-slot="command-group"
      className={cn(
        "overflow-hidden text-mac-label **:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-mac-subheadline **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-mac-label-secondary",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      aria-hidden="true"
      data-slot="command-separator"
      className={cn("mx-2.5 my-1.5 h-px bg-mac-grid", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      ref={listScrollRef(ref)}
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex h-8 cursor-default items-center gap-2.5 rounded-[8px] px-2.5 text-mac-body outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-mac-accent data-[selected=true]:text-white [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-mac-label-secondary data-[selected=true]:*:[svg]:text-white",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon
        className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-mac-body tracking-wider text-mac-label-tertiary group-data-[selected=true]/command-item:text-white/75",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
