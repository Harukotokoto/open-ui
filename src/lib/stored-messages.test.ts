import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  fromStoredMessages,
  hasAssistantReply,
  toStoredMessages,
} from "@/lib/stored-messages";

const user: UIMessage = {
  id: "u1",
  role: "user",
  parts: [{ type: "text", text: "こんにちは" }],
};

describe("toStoredMessages", () => {
  it("生成中のまま残ったパーツを完了にする", () => {
    const assistant: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        { type: "reasoning", text: "考え中", state: "streaming" },
        { type: "text", text: "やあ", state: "streaming" },
      ],
    };

    const stored = toStoredMessages([user, assistant]);

    expect(stored[1]).toEqual({
      id: "a1",
      role: "assistant",
      parts: [
        { type: "reasoning", text: "考え中", state: "done" },
        { type: "text", text: "やあ", state: "done" },
      ],
    });
  });

  it("パーツが空の返答は保存しない", () => {
    const empty: UIMessage = { id: "a1", role: "assistant", parts: [] };

    expect(toStoredMessages([user, empty])).toEqual([user]);
  });

  it("元のメッセージは書き換えない", () => {
    const assistant: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "やあ", state: "streaming" }],
    };

    toStoredMessages([assistant]);

    expect(assistant.parts[0]).toMatchObject({ state: "streaming" });
  });

  it("JSONとして書き出せる形にする(undefinedを含まない)", () => {
    const message = {
      ...user,
      metadata: undefined,
    } as UIMessage;

    const [stored] = toStoredMessages([message]);

    expect(Object.keys(stored as object)).not.toContain("metadata");
  });
});

describe("fromStoredMessages", () => {
  it("保存したものをそのまま戻す", () => {
    expect(fromStoredMessages(toStoredMessages([user]))).toEqual([user]);
  });

  it("形が合わないものは読み飛ばす", () => {
    const stored = [
      user,
      "text",
      null,
      { id: "x", role: "tool", parts: [] },
      { id: "y", role: "user" },
      { role: "user", parts: [] },
    ];

    expect(fromStoredMessages(stored)).toEqual([user]);
  });
});

describe("hasAssistantReply", () => {
  const reply = (text: string): UIMessage => ({
    id: "a1",
    role: "assistant",
    parts: [{ type: "text", text, state: "done" }],
  });

  it("本文のある返答があれば真", () => {
    expect(hasAssistantReply([user, reply("やあ")])).toBe(true);
  });

  it("返答が無い・空白だけ・思考だけなら偽", () => {
    const thinkingOnly: UIMessage = {
      id: "a2",
      role: "assistant",
      parts: [{ type: "reasoning", text: "考え中", state: "done" }],
    };
    expect(hasAssistantReply([user])).toBe(false);
    expect(hasAssistantReply([user, reply(" \n")])).toBe(false);
    expect(hasAssistantReply([user, thinkingOnly])).toBe(false);
  });
});
