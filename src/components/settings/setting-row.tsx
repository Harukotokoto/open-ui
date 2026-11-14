import type { ReactNode } from "react";
import {
  GroupedFormGroup,
  GroupedFormRow,
  GroupedFormRowControl,
  GroupedFormRowDescription,
  GroupedFormRowLabel,
  GroupedFormRowTitle,
  GroupedFormSection,
  GroupedFormSectionTitle,
} from "@/components/ui/grouped-form";
import { cn } from "@/lib/utils";

/**
 * 設定の見出し(「外観」など)と、その下の角丸のまとまり。
 * `plain` にすると角丸の箱に入れず、中身(カードの一覧など)をそのまま並べる。
 */
export function SettingSection({
  title,
  children,
  className,
  plain = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  plain?: boolean;
}) {
  return (
    <GroupedFormSection className={className}>
      <GroupedFormSectionTitle>{title}</GroupedFormSectionTitle>
      {plain ? (
        <div className="flex flex-col">{children}</div>
      ) : (
        <GroupedFormGroup>{children}</GroupedFormGroup>
      )}
    </GroupedFormSection>
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
    <GroupedFormRow
      className={cn(
        "gap-x-4 gap-y-2",
        stacked
          ? "flex-col items-stretch"
          : "flex-col items-start @md:flex-row @md:items-center",
      )}
    >
      <GroupedFormRowLabel className="flex-1">
        <GroupedFormRowTitle>
          <label htmlFor={htmlFor}>{label}</label>
        </GroupedFormRowTitle>
        {description && (
          <GroupedFormRowDescription>{description}</GroupedFormRowDescription>
        )}
      </GroupedFormRowLabel>
      <GroupedFormRowControl className={cn(stacked && "w-full")}>
        {children}
      </GroupedFormRowControl>
    </GroupedFormRow>
  );
}
