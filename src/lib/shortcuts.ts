import type { Platform } from "@/lib/platform";

/** アプリ全体のショートカット。macOSでは⌘、それ以外ではCtrlと組み合わせる。 */
export interface Shortcut {
  /** `KeyboardEvent.key` を小文字にしたもの */
  key: string;
  shift?: boolean;
}

export type ShortcutId =
  | "newChat"
  | "openSettings"
  | "search"
  | "toggleSidebar";

/** ショートカットの登録リスト。`toggleSidebar` はサイドバーの部品が自分で受け取る(表示用)。 */
export const SHORTCUTS: Record<ShortcutId, Shortcut> = {
  newChat: { key: "n" },
  openSettings: { key: "," },
  search: { key: "f" },
  toggleSidebar: { key: "b" },
};

export interface ShortcutKeyInput {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** 押されたキーがショートカットに当たるか。修飾キーは過不足なく一致するときだけ当たりにする。 */
export function matchesShortcut(
  input: ShortcutKeyInput,
  shortcut: Shortcut,
  platform: Platform,
): boolean {
  const mod = platform === "mac" ? input.metaKey : input.ctrlKey;
  const other = platform === "mac" ? input.ctrlKey : input.metaKey;
  return (
    mod &&
    !other &&
    !input.altKey &&
    input.shiftKey === (shortcut.shift ?? false) &&
    input.key.toLowerCase() === shortcut.key
  );
}

/** 画面に出すキーの並び。macOSは記号(⌘ ⇧)、それ以外は名前(Ctrl Shift)。 */
export function formatShortcut(
  shortcut: Shortcut,
  platform: Platform,
): string[] {
  const mac = platform === "mac";
  const keys = [mac ? "⌘" : "Ctrl"];
  if (shortcut.shift) keys.push(mac ? "⇧" : "Shift");
  keys.push(shortcut.key.toUpperCase());
  return keys;
}
