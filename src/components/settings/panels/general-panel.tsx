import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUiSettings, useUpdateUiSettings } from "@/hooks/use-ui-settings";
import { ACCENT_COLORS } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AccentColor, ShiftEnterBehavior, Theme } from "@/types/bindings";

const THEMES: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "自動", icon: MonitorIcon },
  { value: "light", label: "ライト", icon: SunIcon },
  { value: "dark", label: "ダーク", icon: MoonIcon },
];

const SHIFT_ENTER_OPTIONS: { value: ShiftEnterBehavior; label: string }[] = [
  { value: "newline", label: "改行" },
  { value: "send", label: "送信" },
];

/** アクセントカラーの名前と見本の色(macOSテーマのシステムカラー)。 */
const ACCENT_SWATCHES: Record<AccentColor, { label: string; swatch: string }> =
  {
    blue: { label: "ブルー", swatch: "bg-mac-blue" },
    purple: { label: "パープル", swatch: "bg-mac-purple" },
    pink: { label: "ピンク", swatch: "bg-mac-pink" },
    red: { label: "レッド", swatch: "bg-mac-red" },
    orange: { label: "オレンジ", swatch: "bg-mac-orange" },
    yellow: { label: "イエロー", swatch: "bg-mac-yellow" },
    green: { label: "グリーン", swatch: "bg-mac-green" },
    graphite: { label: "グラファイト", swatch: "bg-mac-gray" },
  };

function isTheme(value: string): value is Theme {
  return THEMES.some((theme) => theme.value === value);
}

function isShiftEnterBehavior(value: string): value is ShiftEnterBehavior {
  return SHIFT_ENTER_OPTIONS.some((option) => option.value === value);
}

/** 「一般」。外観と入力欄の操作など、アプリ全体の設定。 */
export function GeneralPanel() {
  const { data } = useUiSettings();
  const update = useUpdateUiSettings();
  const theme = data?.theme ?? "system";
  const accent = data?.accent ?? "blue";
  const shiftEnter = data?.shiftEnter ?? "newline";

  return (
    <>
      <SettingSection title="外観">
        <SettingRow label="テーマ" description="「自動」はOSの設定に従います。">
          <ToggleGroup
            aria-label="テーマ"
            variant="outline"
            spacing={0}
            value={[theme]}
            onValueChange={([next]) => {
              // 選択中のボタンをもう一度押しても、選択なしにはしない
              if (next && isTheme(next)) update.mutate({ theme: next });
            }}
          >
            {THEMES.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem key={value} value={value} className="px-2.5">
                <Icon aria-hidden />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingRow>
        <SettingRow
          label="アクセントカラー"
          description={ACCENT_SWATCHES[accent].label}
        >
          <ToggleGroup
            aria-label="アクセントカラー"
            spacing={1.5}
            className="flex-wrap"
            value={[accent]}
            onValueChange={([next]) => {
              const color = ACCENT_COLORS.find(
                (candidate) => candidate === next,
              );
              if (color) update.mutate({ accent: color });
            }}
          >
            {ACCENT_COLORS.map((color) => {
              const { label, swatch } = ACCENT_SWATCHES[color];
              return (
                <ToggleGroupItem
                  key={color}
                  value={color}
                  aria-label={label}
                  title={label}
                  className="size-6 min-w-6 rounded-full p-0 hover:bg-transparent data-pressed:bg-transparent data-pressed:hover:bg-transparent"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-white shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.15)] group-hover/toggle:brightness-95 group-data-pressed/toggle:ring-2 group-data-pressed/toggle:ring-mac-label-tertiary group-data-pressed/toggle:ring-offset-1 group-data-pressed/toggle:ring-offset-mac-group",
                      swatch,
                    )}
                  >
                    {color === accent && <CheckIcon className="size-2.5" />}
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </SettingRow>
      </SettingSection>
      <SettingSection title="入力">
        <SettingRow
          label="Shift+Enterの動き"
          description={
            shiftEnter === "send"
              ? "Shift+Enterで送信し、Enterで改行します。"
              : "Shift+Enterで改行し、Enterで送信します。"
          }
        >
          <ToggleGroup
            aria-label="Shift+Enterの動き"
            variant="outline"
            spacing={0}
            value={[shiftEnter]}
            onValueChange={([next]) => {
              if (next && isShiftEnterBehavior(next)) {
                update.mutate({ shiftEnter: next });
              }
            }}
          >
            {SHIFT_ENTER_OPTIONS.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} className="px-3">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingRow>
      </SettingSection>
    </>
  );
}
