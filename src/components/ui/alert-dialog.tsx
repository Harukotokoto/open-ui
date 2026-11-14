"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function AlertDialog({
  ...props
}: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-mac-overlay data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

// A macOS 27 alert: a narrow glass panel with an optional app icon, a bold
// title and a short message, all left-aligned, then capsule buttons.
// `layout="stacked"` puts full-width buttons on top of each other.
function AlertDialogContent({
  className,
  size = "default",
  layout = "side-by-side",
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: "default" | "sm"
  layout?: "side-by-side" | "stacked"
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        data-layout={layout}
        className={cn(
          "group/alert-dialog-content fixed top-[50%] left-[50%] z-50 flex w-full translate-x-[-50%] translate-y-[-50%] flex-col gap-3.5 rounded-mac-alert p-4 pt-5 text-mac-label shadow-mac-popover mac-material-hud duration-200 data-[size=default]:max-w-[260px] data-[size=sm]:max-w-[240px] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97]",
          className
        )}
        {...props}
      />
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2.5 px-1.5 pb-0.5 text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex gap-1.5 *:h-7 *:flex-1 *:rounded-full group-data-[layout=side-by-side]/alert-dialog-content:flex-row group-data-[layout=stacked]/alert-dialog-content:flex-col-reverse group-data-[layout=stacked]/alert-dialog-content:*:w-full",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-mac-body font-bold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("-mt-1 text-mac-subheadline text-mac-label", className)}
      {...props}
    />
  )
}

// The app icon shown above the title.
function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-1 inline-flex size-16 items-center justify-start *:[img]:size-16 *:[svg:not([class*='size-'])]:size-12",
        className
      )}
      {...props}
    />
  )
}

// Both buttons close the alert, like Radix's Action and Cancel; handle the
// choice in onClick.
function AlertDialogAction({
  className,
  variant = "default",
  size = "lg",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  variant = "secondary",
  size = "lg",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
