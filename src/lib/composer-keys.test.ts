import { describe, expect, it } from "vitest";
import {
  COMPOSITION_END_WINDOW_MS,
  type EnterKeyInput,
  isJustComposed,
  shouldSendOnEnter,
} from "@/lib/composer-keys";

const enter: EnterKeyInput = {
  key: "Enter",
  shiftKey: false,
  isComposing: false,
  keyCode: 13,
  justComposed: false,
};

describe("shouldSendOnEnter", () => {
  it("Enterで送信し、Shift+Enterは改行にする(既定)", () => {
    expect(shouldSendOnEnter(enter, "newline")).toBe(true);
    expect(shouldSendOnEnter({ ...enter, shiftKey: true }, "newline")).toBe(
      false,
    );
  });

  it("設定が送信なら、Shift+Enterで送信し、Enterは改行にする", () => {
    expect(shouldSendOnEnter({ ...enter, shiftKey: true }, "send")).toBe(true);
    expect(shouldSendOnEnter(enter, "send")).toBe(false);
  });

  it("Enter以外のキーでは送信しない", () => {
    expect(shouldSendOnEnter({ ...enter, key: "a" }, "newline")).toBe(false);
  });

  it("変換中のEnterでは送信しない", () => {
    expect(shouldSendOnEnter({ ...enter, isComposing: true }, "newline")).toBe(
      false,
    );
    expect(
      shouldSendOnEnter(
        { ...enter, isComposing: true, shiftKey: true },
        "send",
      ),
    ).toBe(false);
  });

  it("macOSのように isComposing が偽でも、keyCode 229 なら送信しない", () => {
    expect(shouldSendOnEnter({ ...enter, keyCode: 229 }, "newline")).toBe(
      false,
    );
  });

  it("変換が終わった直後のEnterでは送信しない", () => {
    expect(shouldSendOnEnter({ ...enter, justComposed: true }, "newline")).toBe(
      false,
    );
  });
});

describe("isJustComposed", () => {
  it("変換が終わっていなければ偽", () => {
    expect(isJustComposed(null, 1000)).toBe(false);
  });

  it("終了から一定時間以内だけ真", () => {
    expect(isJustComposed(1000, 1000 + COMPOSITION_END_WINDOW_MS - 1)).toBe(
      true,
    );
    expect(isJustComposed(1000, 1000 + COMPOSITION_END_WINDOW_MS)).toBe(false);
  });
});
