import { useEffect, useSyncExternalStore } from "react";
import { resolveTheme } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme-store";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystemTheme(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSystemPrefersDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

/** 選択したテーマ(と OS の設定)を `<html>` の `dark` クラスに反映する。 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useThemeStore((state) => state.preference);
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemTheme,
    getSystemPrefersDark,
  );
  const resolved = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);

  return children;
}
