import { describe, expect, it } from "vitest";
import { buildFormatGuide, CUSTOM_TAGS, toAllowedTags } from "./custom-tags";

describe("toAllowedTags", () => {
  it("タグ名ごとに、許可する属性を並べる", () => {
    expect(toAllowedTags()).toEqual({ callout: ["type", "title"] });
  });
});

describe("buildFormatGuide", () => {
  it("Markdownの記法(コード・Mermaid・数式)を説明する", () => {
    const guide = buildFormatGuide();

    expect(guide).toContain("```mermaid");
    expect(guide).toContain("KaTeX");
    expect(guide).toContain("fenced code blocks");
  });

  it("定義した独自タグすべての説明を含む", () => {
    const guide = buildFormatGuide();

    for (const [name, spec] of Object.entries(CUSTOM_TAGS)) {
      expect(guide).toContain(`## ${name}`);
      expect(guide).toContain(spec.guide);
    }
  });

  it("独自タグが無ければ、Markdownの説明だけにする", () => {
    const guide = buildFormatGuide({});

    expect(guide).toContain("# Reply formatting");
    expect(guide).not.toContain("# Custom components");
  });

  it("すべての独自タグに、説明と属性がある", () => {
    for (const spec of Object.values(CUSTOM_TAGS)) {
      expect(spec.guide.trim()).not.toBe("");
      expect(spec.attributes.length).toBeGreaterThan(0);
    }
  });
});
