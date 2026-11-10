import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REVEAL_LAG_MS } from "@/lib/smooth-reveal";
import { useSmoothText } from "./use-smooth-text";

const FRAME = 16;
// 対になっていないサロゲート(絵文字の途中で切れた文字列)
const LONE_SURROGATE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSmoothText", () => {
  it("最初から受信中でなければ(保存済みの会話)、すぐ全文を出す", () => {
    const { result } = renderHook(() => useSmoothText("保存済みの返答", false));

    expect(result.current).toEqual({
      text: "保存済みの返答",
      revealing: false,
    });
  });

  it("届いた文字を、すぐには出さず、少し置いてから順に出す", () => {
    const text = "こんにちは、世界。今日はいい天気です。";
    const { result } = renderHook(({ value }) => useSmoothText(value, true), {
      initialProps: { value: text },
    });

    advance(REVEAL_LAG_MS - FRAME * 2);
    expect(result.current.text).toBe("");

    advance(FRAME * 4);
    const first = result.current.text;
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThan(text.length);
    expect(text.startsWith(first)).toBe(true);

    advance(FRAME * 3);
    expect(result.current.text.length).toBeGreaterThan(first.length);
    expect(result.current.revealing).toBe(true);
  });

  it("書きかけのタグは、閉じるまで出さない", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useSmoothText(value, true),
      { initialProps: { value: 'あ<callout type="wa' } },
    );

    advance(REVEAL_LAG_MS * 4);
    expect(result.current.text).toBe("あ");

    rerender({ value: 'あ<callout type="warning">い' });
    advance(REVEAL_LAG_MS * 8);
    expect(result.current.text).toBe('あ<callout type="warning">い');
  });

  it("受信が終わったら、残りを出し切って、動きを止める", () => {
    const text = "あ".repeat(200);
    const { result, rerender } = renderHook(
      ({ streaming }) => useSmoothText(text, streaming),
      { initialProps: { streaming: true } },
    );
    advance(REVEAL_LAG_MS);

    rerender({ streaming: false });
    expect(result.current.revealing).toBe(true);

    advance(FRAME * 60);
    expect(result.current).toEqual({ text, revealing: false });
  });

  it("受信が終わるとき、書きかけのままのタグも出し切る", () => {
    const { result, rerender } = renderHook(
      ({ streaming }) => useSmoothText("a <b", streaming),
      { initialProps: { streaming: true } },
    );
    advance(REVEAL_LAG_MS * 3);
    expect(result.current.text).toBe("a ");

    rerender({ streaming: false });
    advance(FRAME * 10);

    expect(result.current).toEqual({ text: "a <b", revealing: false });
  });

  it("絵文字の途中では切らない", () => {
    const { result } = renderHook(() => useSmoothText("😀😀😀😀😀", true));

    for (let i = 0; i < 30; i++) {
      advance(FRAME);
      const shown = result.current.text;
      // 孤立したサロゲートが無い(全体が整った文字列)
      expect(shown).not.toMatch(LONE_SURROGATE);
    }
  });
});
