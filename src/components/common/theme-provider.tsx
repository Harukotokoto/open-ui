import { useLayoutEffect, useSyncExternalStore } from "react";
import { useUiSettings } from "@/hooks/use-ui-settings";
import { resolveTheme } from "@/lib/theme";

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
 * 設定ファイルのテーマの選択(と OS の設定)を `<html>` の `dark` クラスに反映する。
 * 設定を読み込むまで、読めなかったときも、OS の設定に従う。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data } = useUiSettings();
  const preference = data?.theme ?? "system";
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

  return children;
}
