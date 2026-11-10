import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  formatReplyStats,
  getReplyStats,
  type ReplyStats,
  tokensPerSecond,
} from "./reply-stats";

const stats = (over: Partial<ReplyStats> = {}): ReplyStats => ({
  tokens: 60,
  elapsedMs: 2000,
  estimated: false,
  ...over,
});

const message = (metadata: unknown): UIMessage => ({
  id: "m1",
  role: "assistant",
  parts: [],
  metadata,
});

describe("getReplyStats", () => {
  it("メタデータの統計を返す", () => {
    expect(getReplyStats(message({ stats: stats() }))).toEqual(stats());
  });

  it("メタデータが無い・形が合わないときは undefined", () => {
    expect(getReplyStats(message(undefined))).toBeUndefined();
    expect(getReplyStats(message("x"))).toBeUndefined();
    expect(getReplyStats(message({}))).toBeUndefined();
    expect(
      getReplyStats(message({ stats: { tokens: "60", elapsedMs: 1 } })),
    ).toBeUndefined();
  });
});

describe("tokensPerSecond", () => {
  it("トークン数を秒で割る", () => {
    expect(tokensPerSecond(stats())).toBe(30);
  });

  it("時間かトークン数が0なら undefined", () => {
    expect(tokensPerSecond(stats({ elapsedMs: 0 }))).toBeUndefined();
    expect(tokensPerSecond(stats({ tokens: 0 }))).toBeUndefined();
  });
});

describe("formatReplyStats", () => {
  it("小数1桁で出す", () => {
    expect(formatReplyStats(stats({ tokens: 127, elapsedMs: 3000 }))).toBe(
      "42.3 tokens/s",
    );
  });

  it("100以上は整数で出す", () => {
    expect(formatReplyStats(stats({ tokens: 250, elapsedMs: 2000 }))).toBe(
      "125 tokens/s",
    );
  });

  it("推定のときは「約」を付ける", () => {
    expect(formatReplyStats(stats({ estimated: true }))).toBe(
      "約 30.0 tokens/s",
    );
  });

  it("測れないときは undefined", () => {
    expect(formatReplyStats(stats({ elapsedMs: 0 }))).toBeUndefined();
  });
});
