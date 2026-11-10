import { describe, expect, it } from "vitest";
import {
  alignToCharBoundary,
  revealableLength,
  stepVisibleLength,
} from "./smooth-reveal";

describe("revealableLength", () => {
  it("タグが無ければ、そのまま出してよい", () => {
    expect(revealableLength("こんにちは", 5)).toBe(5);
    expect(revealableLength("こんにちは", 3)).toBe(3);
  });

  it("書きかけのタグは、その手前までにする", () => {
    const text = '前置き\n<callout type="warn';
    expect(revealableLength(text, text.length)).toBe(4);
    // 末尾の `<` は、次に届く文字でタグになるかもしれない
    expect(revealableLength("a <", 3)).toBe(2);
    expect(revealableLength("a <c", 4)).toBe(2);
  });

  it("閉じたタグは出してよい", () => {
    const text = '<callout type="warning">本文';
    expect(revealableLength(text, text.length)).toBe(text.length);
  });

  it("属性の値の中の > では、閉じたと見なさない", () => {
    const text = '<callout title="a > b';
    expect(revealableLength(text, text.length)).toBe(0);
    const closed = '<callout title="a > b">';
    expect(revealableLength(closed, closed.length)).toBe(closed.length);
  });

  it("閉じタグの書きかけも止める", () => {
    const text = "<callout>本文</call";
    expect(revealableLength(text, text.length)).toBe("<callout>本文".length);
  });

  it("不等号の比較など、タグではない < は止めない", () => {
    expect(revealableLength("a < b", 5)).toBe(5);
    expect(revealableLength("1<2", 3)).toBe(3);
  });

  it("上限(end)より先は見ない", () => {
    const text = "あい<callout>う";
    expect(revealableLength(text, 2)).toBe(2);
    expect(revealableLength(text, 5)).toBe(2);
  });

  it("範囲外の end は、文字列の長さに収める", () => {
    expect(revealableLength("abc", 99)).toBe(3);
    expect(revealableLength("abc", -1)).toBe(0);
  });
});

describe("alignToCharBoundary", () => {
  it("サロゲートペアの途中なら、1文字進めて切る", () => {
    const text = "a😀b";
    expect(alignToCharBoundary(text, 2)).toBe(3);
    expect(alignToCharBoundary(text, 3)).toBe(3);
  });

  it("端は、そのまま", () => {
    expect(alignToCharBoundary("abc", 0)).toBe(0);
    expect(alignToCharBoundary("abc", 3)).toBe(3);
  });
});

describe("stepVisibleLength", () => {
  it("溜まっていなければ進まない", () => {
    expect(stepVisibleLength(10, 10, false)).toBe(10);
    expect(stepVisibleLength(12, 10, false)).toBe(12);
  });

  it("少しでも溜まっていれば、最低1文字は進む", () => {
    expect(stepVisibleLength(0, 1, false)).toBe(1);
    expect(stepVisibleLength(0, 3, false)).toBe(1);
  });

  it("溜まった量に比例して速く進み、目標は超えない", () => {
    const slow = stepVisibleLength(0, 100, false);
    const fast = stepVisibleLength(0, 1000, false);
    expect(fast).toBeGreaterThan(slow);
    expect(stepVisibleLength(0, 5, true)).toBeLessThanOrEqual(5);
  });

  it("出し切るときは、通常より速い", () => {
    expect(stepVisibleLength(0, 400, true)).toBeGreaterThan(
      stepVisibleLength(0, 400, false),
    );
  });
});
