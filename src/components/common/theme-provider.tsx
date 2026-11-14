import { useLayoutEffect, useSyncExternalStore } from "react";
import { useUiSettings } from "@/hooks/use-ui-settings";
import { platform } from "@/lib/platform";
import { ACCENT_COLORS, accentClass, resolveTheme } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemPrefersDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

/**
 * 設定ファイルのテーマ・アクセントカラーの選択(と OS の設定)を `<html>` のクラスに反映する。
 * 設定を読み込むまで、読めなかったときも、OS の設定と青のアクセントに従う。
 * OSの種類も `data-platform` に出す(macOSでは信号機ボタンの場所を空ける)。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data } = useUiSettings();
  const preference = data?.theme ?? "system";
  const accent = data?.accent ?? "blue";
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemPrefersDark,
  );
  const resolved = resolveTheme(preference, systemPrefersDark);

  // 初回描画の前に反映する(`useEffect` だと、ダークの OS で一瞬ライトで表示される)
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const candidate of ACCENT_COLORS) {
      const name = accentClass(candidate);
      if (name) root.classList.toggle(name, candidate === accent);
    }
  }, [accent]);

  useLayoutEffect(() => {
    document.documentElement.dataset.platform = platform;
  }, []);

  return children;
}
