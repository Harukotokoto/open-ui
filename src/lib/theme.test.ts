import { describe, expect, it } from "vitest";
import { ACCENT_COLORS, accentClass, resolveTheme } from "./theme";

describe("accentClass", () => {
  it("青はテーマの既定なのでクラスを付けない", () => {
    expect(accentClass("blue")).toBeNull();
  });

  it("ほかの色はmacOSテーマのクラスにする", () => {
    expect(accentClass("graphite")).toBe("mac-accent-graphite");
    expect(
      ACCENT_COLORS.filter((accent) => accent !== "blue").map(accentClass),
    ).not.toContain(null);
  });
});

describe("resolveTheme", () => {
  it("system のときは OS の設定に従う", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("明示した選択は OS の設定より優先する", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
