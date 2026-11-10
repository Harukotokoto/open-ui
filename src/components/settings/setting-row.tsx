import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 設定の見出し(「外観」など)と、その下に並べる項目のまとまり。 */
export function SettingSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      <h3 className="py-2 text-sm">{title}</h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  /** 入力欄の `id`。ラベルと結びつける */
  htmlFor?: string;
  description?: ReactNode;
  /** 入力欄が大きい項目は、ラベルの下に広げて置く */
  stacked?: boolean;
  children: ReactNode;
}

/** 設定1項目。左に名前と説明、右に操作を置く(幅が狭いと上下に並べる)。 */
export function SettingRow({
  label,
  htmlFor,
  description,
  stacked = false,
  children,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex gap-x-4 gap-y-2 border-b py-3 last:border-b-0",
        stacked
          ? "flex-col"
          : "flex-col items-start @md:flex-row @md:items-center @md:justify-between",
      )}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="text-sm">
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className={cn("shrink-0", stacked && "w-full")}>{children}</div>
    </div>
  );
}
