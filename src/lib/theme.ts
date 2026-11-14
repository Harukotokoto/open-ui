import type { AccentColor, Theme } from "@/types/bindings";

/** ユーザーが選ぶテーマ。`system` は OS の設定に従う。設定ファイルに保存する。 */
export type ThemePreference = Theme;

/** 実際に適用されるテーマ。 */
export type ResolvedTheme = "light" | "dark";

/** 選択と OS の設定から、適用するテーマを決める。 */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

/** 選べるアクセントカラー(設定画面に並べる順)。 */
export const ACCENT_COLORS: readonly AccentColor[] = [
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
  "graphite",
];

/**
 * アクセントカラーを切り替える `<html>` のクラス(macOSテーマの `.mac-accent-*`)。
 * 青はテーマの既定なので、クラスを付けない。
 */
export function accentClass(accent: AccentColor): string | null {
  return accent === "blue" ? null : `mac-accent-${accent}`;
}
