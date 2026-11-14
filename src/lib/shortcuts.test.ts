import { describe, expect, it } from "vitest";
import { detectPlatform } from "@/lib/platform";
import {
  formatShortcut,
  matchesShortcut,
  SHORTCUTS,
  type ShortcutKeyInput,
} from "@/lib/shortcuts";

const press = (patch: Partial<ShortcutKeyInput>): ShortcutKeyInput => ({
  key: "n",
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...patch,
});

describe("matchesShortcut", () => {
  it("macOSでは⌘と組み合わせたときだけ当たる", () => {
    expect(
      matchesShortcut(press({ metaKey: true }), SHORTCUTS.newChat, "mac"),
    ).toBe(true);
    expect(
      matchesShortcut(press({ ctrlKey: true }), SHORTCUTS.newChat, "mac"),
    ).toBe(false);
  });

  it("macOS以外ではCtrlと組み合わせたときだけ当たる", () => {
    expect(
      matchesShortcut(press({ ctrlKey: true }), SHORTCUTS.newChat, "other"),
    ).toBe(true);
    expect(
      matchesShortcut(press({ metaKey: true }), SHORTCUTS.newChat, "other"),
    ).toBe(false);
  });

  it("余計な修飾キーがあると当たらない", () => {
    expect(
      matchesShortcut(
        press({ ctrlKey: true, shiftKey: true }),
        SHORTCUTS.newChat,
        "other",
      ),
    ).toBe(false);
    expect(
      matchesShortcut(
        press({ ctrlKey: true, altKey: true }),
        SHORTCUTS.newChat,
        "other",
      ),
    ).toBe(false);
  });

  it("大文字のキー(Caps Lock)でも当たる", () => {
    expect(
      matchesShortcut(
        press({ key: "N", ctrlKey: true }),
        SHORTCUTS.newChat,
        "other",
      ),
    ).toBe(true);
  });

  it("記号のキーも比べられる", () => {
    expect(
      matchesShortcut(
        press({ key: ",", metaKey: true }),
        SHORTCUTS.openSettings,
        "mac",
      ),
    ).toBe(true);
  });
});

describe("formatShortcut", () => {
  it("macOSは記号で、それ以外はキーの名前で並べる", () => {
    expect(formatShortcut(SHORTCUTS.search, "mac")).toEqual(["⌘", "F"]);
    expect(formatShortcut(SHORTCUTS.search, "other")).toEqual(["Ctrl", "F"]);
    expect(formatShortcut({ key: "s", shift: true }, "mac")).toEqual([
      "⌘",
      "⇧",
      "S",
    ]);
  });
});

describe("detectPlatform", () => {
  it("macOSのUser-Agentを見分ける", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
      ),
    ).toBe("mac");
    expect(
      detectPlatform(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ),
    ).toBe("other");
  });
});
