import { describe, expect, it } from "vitest";
import {
  activeModel,
  DEFAULT_MODEL_LABEL,
  isModelSelected,
  matchesModelQuery,
  modelOptions,
  selectionLabel,
} from "@/lib/model-selection";
import type { ConnectionProfile, ProfileBook } from "@/types/bindings";

function profile(id: string, selectedModel: string | null): ConnectionProfile {
  return {
    id,
    name: id,
    kind: "openAiCompatible",
    baseUrl: `http://${id}/v1`,
    selectedModel,
  };
}

const book: ProfileBook = {
  activeId: "b",
  profiles: [profile("a", "alpha"), profile("b", "beta"), profile("c", null)],
};

describe("activeModel / selectionLabel", () => {
  it("使用中のプロファイルのモデルを返す", () => {
    expect(activeModel(book)).toBe("beta");
    expect(selectionLabel(book)).toBe("beta");
  });

  it("モデルを選んでいなければ、nullと「モデル」", () => {
    const none = { ...book, activeId: "c" };
    expect(activeModel(none)).toBeNull();
    expect(selectionLabel(none)).toBe(DEFAULT_MODEL_LABEL);
  });
});

describe("isModelSelected", () => {
  it("使用中のプロファイルの選択モデルだけが選ばれている", () => {
    expect(isModelSelected(book, "b", "beta")).toBe(true);
    expect(isModelSelected(book, "b", "other")).toBe(false);
    expect(isModelSelected(book, "b", null)).toBe(false);
  });

  it("使用中でないプロファイルは、同じモデル名でも選ばれていない", () => {
    expect(isModelSelected(book, "a", "alpha")).toBe(false);
  });

  it("モデル未選択のとき、使用中のプロファイルでは「サーバーの既定」が選ばれている", () => {
    const none = { ...book, activeId: "c" };
    expect(isModelSelected(none, "c", null)).toBe(true);
    expect(isModelSelected(none, "c", "x")).toBe(false);
  });
});

describe("matchesModelQuery", () => {
  const keywords = ["qwen3-30b-a3b", "LM Studio"];

  it("入力が空なら、すべて一致", () => {
    expect(matchesModelQuery("v", "", keywords)).toBe(1);
    expect(matchesModelQuery("v", "   ", keywords)).toBe(1);
  });

  it("部分一致で、大文字小文字は区別しない", () => {
    expect(matchesModelQuery("v", "QWEN", keywords)).toBe(1);
    expect(matchesModelQuery("v", "30b", keywords)).toBe(1);
    expect(matchesModelQuery("v", "a3b", keywords)).toBe(1);
  });

  it("プロファイル名でも見つかる", () => {
    expect(matchesModelQuery("v", "studio", keywords)).toBe(1);
  });

  it("空白で区切った語は、すべて含まれる必要がある", () => {
    expect(matchesModelQuery("v", "qwen studio", keywords)).toBe(1);
    expect(matchesModelQuery("v", "qwen ollama", keywords)).toBe(0);
  });

  it("あいまい検索はしない(離れた文字の並びでは一致しない)", () => {
    expect(matchesModelQuery("v", "qw3b", keywords)).toBe(0);
    expect(matchesModelQuery("v", "llama", ["gemma3", "LM Studio"])).toBe(0);
  });

  it("キーワードが無ければ、入力があるとき一致しない", () => {
    expect(matchesModelQuery("v", "a")).toBe(0);
  });
});

describe("modelOptions", () => {
  it("取得した一覧をそのまま返す", () => {
    expect(modelOptions(profile("a", "m1"), ["m1", "m2"])).toEqual([
      "m1",
      "m2",
    ]);
  });

  it("選択中のモデルが一覧に無ければ、先頭に足す", () => {
    expect(modelOptions(profile("a", "gone"), ["m1"])).toEqual(["gone", "m1"]);
  });

  it("一覧を取得できていなくても、選択中のモデルは出す", () => {
    expect(modelOptions(profile("a", "m1"), undefined)).toEqual(["m1"]);
    expect(modelOptions(profile("a", null), undefined)).toEqual([]);
  });

  it("元の配列は変えない", () => {
    const fetched = ["m1"];
    modelOptions(profile("a", "gone"), fetched);
    expect(fetched).toEqual(["m1"]);
  });
});
