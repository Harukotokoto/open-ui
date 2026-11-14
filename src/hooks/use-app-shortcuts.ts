import { useEffect, useRef } from "react";
import { platform } from "@/lib/platform";
import { matchesShortcut, SHORTCUTS, type ShortcutId } from "@/lib/shortcuts";

type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

/**
 * アプリ全体のショートカットを受け取る。WebViewの標準の動き(Ctrl+Fの検索バー、Ctrl+Nの新しいウィンドウ)は止める。
 * 変換中のキー入力は無視する。
 */
export function useAppShortcuts(handlers: ShortcutHandlers) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      for (const [id, handler] of Object.entries(latest.current)) {
        if (!handler) continue;
        if (matchesShortcut(event, SHORTCUTS[id as ShortcutId], platform)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
