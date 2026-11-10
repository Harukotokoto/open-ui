import { describe, expect, it } from "vitest";
import { draftOf, isSameSettings, parseDraft } from "@/lib/generation-draft";

const empty = { systemPrompt: "", temperature: "", maxTokens: "" };

describe("parseDraft", () => {
  it("空欄はサーバーの既定(null)にする", () => {
    expect(parseDraft(empty)).toEqual({
      ok: true,
      value: { systemPrompt: "", temperature: null, maxTokens: null },
    });
  });

  it("数値を読み取り、システムプロンプトはそのまま渡す", () => {
    expect(
      parseDraft({
        systemPrompt: " 簡潔に ",
        temperature: " 0.7 ",
        maxTokens: "512",
      }),
    ).toEqual({
      ok: true,
      value: { systemPrompt: " 簡潔に ", temperature: 0.7, maxTokens: 512 },
    });
  });

  it("境界の値は受け付ける", () => {
    expect(parseDraft({ ...empty, temperature: "0", maxTokens: "1" }).ok).toBe(
      true,
    );
    expect(parseDraft({ ...empty, temperature: "2" }).ok).toBe(true);
  });

  it.each(["abc", "-0.1", "2.1", "Infinity"])(
    "temperature が %s のときは失敗にする",
    (temperature) => {
      expect(parseDraft({ ...empty, temperature }).ok).toBe(false);
    },
  );

  it.each(["0", "-1", "1.5", "abc"])(
    "最大トークン数が %s のときは失敗にする",
    (maxTokens) => {
      expect(parseDraft({ ...empty, maxTokens }).ok).toBe(false);
    },
  );
});

describe("draftOf / isSameSettings", () => {
  it("省略された項目は空欄の下書きになる", () => {
    expect(draftOf({})).toEqual(empty);
    expect(draftOf({ temperature: 0, maxTokens: 8 })).toEqual({
      systemPrompt: "",
      temperature: "0",
      maxTokens: "8",
    });
  });

  it("省略と null と空文字は同じ内容として扱う", () => {
    expect(
      isSameSettings(
        {},
        { systemPrompt: "", temperature: null, maxTokens: null },
      ),
    ).toBe(true);
    expect(isSameSettings({ temperature: 0 }, { temperature: null })).toBe(
      false,
    );
  });
});
