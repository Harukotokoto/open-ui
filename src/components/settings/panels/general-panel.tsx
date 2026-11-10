import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUiSettings, useUpdateUiSettings } from "@/hooks/use-ui-settings";
import type { Theme } from "@/types/bindings";

const THEMES: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "システムの設定に従う", icon: MonitorIcon },
  { value: "light", label: "ライト", icon: SunIcon },
  { value: "dark", label: "ダーク", icon: MoonIcon },
];

function isTheme(value: string): value is Theme {
  return THEMES.some((theme) => theme.value === value);
}

/** 「一般」。外観など、アプリ全体の見た目。 */
export function GeneralPanel() {
  const { data } = useUiSettings();
  const update = useUpdateUiSettings();
  const theme = data?.theme ?? "system";

  return (
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
  );
}
