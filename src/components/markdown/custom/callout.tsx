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

const VARIANTS: Record<
  CalloutType,
  { label: string; icon: LucideIcon; className: string }
> = {
  note: { label: "補足", icon: Info, className: "border-l-muted-foreground" },
  tip: { label: "ヒント", icon: Lightbulb, className: "border-l-ring" },
  warning: {
    label: "注意",
    icon: TriangleAlert,
    className: "border-l-foreground",
  },
  danger: {
    label: "警告",
    icon: OctagonAlert,
    className: "border-l-destructive text-destructive",
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
        "my-3 flex gap-2.5 rounded-lg border border-l-4 bg-card px-3 py-2.5 text-sm leading-6 text-card-foreground",
        variant.className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 text-foreground [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {heading && <p className="mb-1 font-medium">{heading}</p>}
        {children}
      </div>
    </aside>
  );
}
