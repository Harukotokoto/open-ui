import { unwrap } from "@/services/ipc";
import { commands, type UiSettings } from "@/types/bindings";

/** 保存されている画面の設定(サイドバーの開閉など)。 */
export function getUiSettings(): Promise<UiSettings> {
  return unwrap(commands.uiSettingsGet());
}

export function updateUiSettings(ui: UiSettings): Promise<UiSettings> {
  return unwrap(commands.uiSettingsUpdate(ui));
}
