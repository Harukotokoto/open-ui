import type { ShiftEnterBehavior } from "@/types/bindings";

/** 変換を確定したEnterとみなす、変換の終了からの経過時間(ミリ秒)。 */
export const COMPOSITION_END_WINDOW_MS = 100;

/** `keydown` のうち、判定に使う部分。 */
export interface EnterKeyInput {
  key: string;
  shiftKey: boolean;
  /** 変換の最中か(`KeyboardEvent.isComposing`) */
  isComposing: boolean;
  /** 非推奨だが、変換中のキーは 229 になる(`isComposing` が偽でも) */
  keyCode: number;
  /** 直前に変換が終わったばかりか。`compositionend` からの経過で決める */
  justComposed: boolean;
}

/**
 * 入力欄でEnterを押したとき、メッセージを送信するか。
 *
 * - 変換を確定するEnterでは送信しない。macOS(WebKit)は `compositionend` を `keydown` より先に
 *   送るため、`isComposing` が偽になる。`keyCode` が 229 であること、または変換の終了の
 *   直後であることでも見分ける。
 * - `shiftEnter` が `newline` なら「Enterで送信、Shift+Enterで改行」、
 *   `send` なら「Shift+Enterで送信、Enterで改行」。
 *
 * 送らないときは、ブラウザの既定の動き(改行など)に任せる。
 */
export function shouldSendOnEnter(
  input: EnterKeyInput,
  shiftEnter: ShiftEnterBehavior,
): boolean {
  if (input.key !== "Enter") return false;
  if (input.isComposing || input.keyCode === 229 || input.justComposed) {
    return false;
  }
  return shiftEnter === "send" ? input.shiftKey : !input.shiftKey;
}

/** 変換の終了から `now` までが、確定のEnterとみなす範囲か。 */
export function isJustComposed(
  compositionEndedAt: number | null,
  now: number,
): boolean {
  return (
    compositionEndedAt !== null &&
    now - compositionEndedAt < COMPOSITION_END_WINDOW_MS
  );
}
