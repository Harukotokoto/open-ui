import { describe, expect, it } from "vitest";
import { filterCategories } from "@/lib/settings-search";

const categories = [
  { label: "一般", keywords: ["外観", "テーマ", "ダーク"] },
  { label: "接続", keywords: ["URL", "APIキー"] },
  { label: "生成", keywords: ["システムプロンプト", "temperature"] },
];

describe("filterCategories", () => {
  it("語が無ければ、すべてを並びのまま返す", () => {
    expect(filterCategories(categories, "  ")).toEqual(categories);
  });

  it("カテゴリ名で絞り込む", () => {
    expect(filterCategories(categories, "接続")).toEqual([categories[1]]);
  });

  it("項目名のキーワードでも見つかる", () => {
    expect(filterCategories(categories, "テーマ")).toEqual([categories[0]]);
  });

  it("大文字小文字と全角半角の違いを無視する", () => {
    expect(filterCategories(categories, "api")).toEqual([categories[1]]);
    expect(filterCategories(categories, "ＴＥＭＰ")).toEqual([categories[2]]);
  });

  it("複数の語はすべてに合うものだけを残す", () => {
    expect(filterCategories(categories, "生成 temperature")).toEqual([
      categories[2],
    ]);
    expect(filterCategories(categories, "一般 接続")).toEqual([]);
  });
});
