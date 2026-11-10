import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUiSettings, useUpdateUiSettings } from "@/hooks/use-ui-settings";
import type { ShiftEnterBehavior, Theme } from "@/types/bindings";

const THEMES: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "システムの設定に従う", icon: MonitorIcon },
  { value: "light", label: "ライト", icon: SunIcon },
  { value: "dark", label: "ダーク", icon: MoonIcon },
];

const SHIFT_ENTER_OPTIONS: { value: ShiftEnterBehavior; label: string }[] = [
  { value: "newline", label: "改行" },
  { value: "send", label: "送信" },
];

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
  const shiftEnter = data?.shiftEnter ?? "newline";

  return (
    <>
      <SettingSection title="外観">
        <SettingRow label="テーマ">
          <ToggleGroup
            aria-label="テーマ"
            spacing={1}
            className="bg-foreground/5 p-0.5"
            value={[theme]}
            onValueChange={([next]) => {
              // 選択中のボタンをもう一度押しても、選択なしにはしない
              if (next && isTheme(next)) update.mutate({ theme: next });
            }}
          >
            {THEMES.map(({ value, label, icon: Icon }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                aria-label={label}
                title={label}
                className="aria-pressed:bg-foreground/15"
              >
                <Icon />
              </ToggleGroupItem>
            ))}
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
            spacing={1}
            className="bg-foreground/5 p-0.5"
            value={[shiftEnter]}
            onValueChange={([next]) => {
              if (next && isShiftEnterBehavior(next)) {
                update.mutate({ shiftEnter: next });
              }
            }}
          >
            {SHIFT_ENTER_OPTIONS.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="px-3 aria-pressed:bg-foreground/15"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </SettingRow>
      </SettingSection>
    </>
  );
}
