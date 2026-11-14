"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

// Message bubbles as in Messages: blue for what you send, grey for what
// you receive, tinted, outlined or plain.
const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-mac-blue *:data-[slot=bubble-content]:text-white [&>[data-slot=bubble-content]:is(button,a):hover]:brightness-110",
        secondary:
          "*:data-[slot=bubble-content]:bg-[#e9e9eb] *:data-[slot=bubble-content]:text-mac-label dark:*:data-[slot=bubble-content]:bg-[#3b3b3d] [&>[data-slot=bubble-content]:is(button,a):hover]:brightness-95",
        muted:
          "*:data-[slot=bubble-content]:bg-mac-fill-secondary [&>[data-slot=bubble-content]:is(button,a):hover]:bg-mac-fill-primary",
        tinted:
          "*:data-[slot=bubble-content]:bg-mac-accent/15 *:data-[slot=bubble-content]:text-mac-label [&>[data-slot=bubble-content]:is(button,a):hover]:bg-mac-accent/22",
        outline:
          "*:data-[slot=bubble-content]:bg-mac-window *:data-[slot=bubble-content]:shadow-[inset_0_0_0_1px_var(--mac-grid)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-mac-fill-tertiary",
        ghost:
          "*:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-mac-fill-tertiary",
        destructive:
          "*:data-[slot=bubble-content]:bg-mac-red/10 *:data-[slot=bubble-content]:text-mac-red [&>[data-slot=bubble-content]:is(button,a):hover]:bg-mac-red/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end"
  }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  )
}

function BubbleContent({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "w-fit max-w-full min-w-0 overflow-hidden rounded-[18px] px-3 py-1.5 text-mac-body leading-[17px] wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-[filter,background-color] [button,a]:outline-none [button,a]:focus-visible:mac-focus-ring",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "bubble-content",
    },
  })
}

const bubbleReactionsVariants = cva(
  "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-mac-window px-1.5 py-0.5 text-mac-body ring-2 ring-mac-window shadow-[0_1px_2px_rgb(0_0_0/0.15)] has-[button]:p-0",
  {
    variants: {
      side: {
        top: "top-0 -translate-y-3/4",
        bottom: "bottom-0 translate-y-3/4",
      },
      align: {
        start: "left-3",
        end: "right-3",
      },
    },
    defaultVariants: {
      side: "bottom",
      align: "end",
    },
  }
)

function BubbleReactions({
  side = "bottom",
  align = "end",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  side?: "top" | "bottom"
}) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(bubbleReactionsVariants({ side, align }), className)}
      {...props}
    />
  )
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions }
