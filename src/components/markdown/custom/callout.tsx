import {
  Info,
  Lightbulb,
  type LucideIcon,
  OctagonAlert,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalloutType = "note" | "tip" | "warning" | "danger";

/** 種類ごとの色(`--callout`)。背景の薄い色味とアイコンに使い、文字は読みやすいよう本文の色のままにする。 */
const VARIANTS: Record<
  CalloutType,
  { label: string; icon: LucideIcon; className: string }
> = {
  note: { label: "補足", icon: Info, className: "[--callout:var(--mac-gray)]" },
  tip: {
    label: "ヒント",
    icon: Lightbulb,
    className: "[--callout:var(--mac-accent)]",
  },
  warning: {
    label: "注意",
    icon: TriangleAlert,
    className: "[--callout:var(--mac-orange)]",
  },
  danger: {
    label: "警告",
    icon: OctagonAlert,
    className: "[--callout:var(--mac-red)]",
  },
};

function toType(value: unknown): CalloutType {
  return typeof value === "string" && value in VARIANTS
    ? (value as CalloutType)
    : "note";
}

interface CalloutProps {
  type?: string;
  title?: string;
  children?: ReactNode;
}

/**
 * 独自タグ `<callout type="note|tip|warning|danger" title="…">`。
 * 見逃してほしくない補足・ヒント・注意・警告を、本文から目立たせる。
 * 種類は、色だけでなくアイコンと名前でも分かるようにする。
 */
export function Callout({ type, title, children }: CalloutProps) {
  const variant = VARIANTS[toType(type)];
  const Icon = variant.icon;
  const heading = title?.trim() || undefined;
  return (
    <aside
      data-slot="callout"
      aria-label={heading ?? variant.label}
      className={cn(
        // 色味を薄く敷いた角丸の面(枠線や太い縦線は使わない)
        "my-3 flex gap-2.5 rounded-mac-group bg-[color-mix(in_srgb,var(--callout)_12%,transparent)] px-3.5 py-3 text-(length:--chat-font-size) leading-(--chat-line-height) text-mac-label",
        variant.className,
      )}
    >
      <Icon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-(--callout)"
      />
      <div className="min-w-0 flex-1 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {heading && <p className="mb-1 font-semibold">{heading}</p>}
        {children}
      </div>
    </aside>
  );
}
