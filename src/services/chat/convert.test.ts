import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { ChatEvent } from "@/types/bindings";
import { createEventConverter, toWireMessages } from "./convert";

function message(
  role: UIMessage["role"],
  parts: UIMessage["parts"],
): UIMessage {
  return { id: crypto.randomUUID(), role, parts };
}

function convert(events: ChatEvent[]) {
  const converter = createEventConverter();
  return events.flatMap((event) => converter.push(event));
}

describe("toWireMessages", () => {
  it("本文だけを送り、思考は含めない", () => {
    const messages = [
      message("user", [{ type: "text", text: "こんにちは" }]),
      message("assistant", [
        { type: "reasoning", text: "考え中…" },
        { type: "text", text: "はい、" },
        { type: "text", text: "こんにちは" },
      ]),
    ];

    expect(toWireMessages(messages)).toEqual([
      { role: "user", content: "こんにちは" },
      { role: "assistant", content: "はい、こんにちは" },
    ]);
  });

  it("本文が空のメッセージは送らない", () => {
    const messages = [
      message("user", [{ type: "text", text: "やあ" }]),
      message("assistant", [{ type: "reasoning", text: "考えて中断した" }]),
    ];

    expect(toWireMessages(messages)).toEqual([
      { role: "user", content: "やあ" },
    ]);
  });

  it("添付はIDだけを渡し、本文が空でも添付があれば送る", () => {
    const messages = [
      message("user", [
        {
          type: "file",
          mediaType: "image/png",
          filename: "a.png",
          url: "attachment://id-1",
        },
        {
          type: "file",
          mediaType: "text/plain",
          filename: "b.txt",
          url: "attachment://id-2",
        },
      ]),
    ];

    expect(toWireMessages(messages)).toEqual([
      { role: "user", content: "", attachments: ["id-1", "id-2"] },
    ]);
  });

  it("添付でないURLのファイルは、渡さない", () => {
    const messages = [
      message("user", [
        { type: "text", text: "これ" },
        {
          type: "file",
          mediaType: "image/png",
          url: "https://example.com/a.png",
        },
      ]),
    ];

    expect(toWireMessages(messages)).toEqual([
      { role: "user", content: "これ" },
    ]);
  });
});

describe("createEventConverter", () => {
  it("本文の増分を、開始・増分・終了のチャンクにする", () => {
    const chunks = convert([
      { type: "delta", text: "こん" },
      { type: "delta", text: "にちは" },
      { type: "done" },
    ]);

    expect(chunks).toEqual([
      { type: "start" },
      { type: "start-step" },
      { type: "text-start", id: "text-0" },
      { type: "text-delta", id: "text-0", delta: "こん" },
      { type: "text-delta", id: "text-0", delta: "にちは" },
      { type: "text-end", id: "text-0" },
      { type: "finish-step" },
      { type: "finish" },
    ]);
  });

  it("思考のあとに本文が来たら、思考を閉じてから本文を開く", () => {
    const chunks = convert([
      { type: "reasoning", text: "ええと" },
      { type: "delta", text: "答え" },
      { type: "done" },
    ]);

    expect(chunks.map((c) => c.type)).toEqual([
      "start",
      "start-step",
      "reasoning-start",
      "reasoning-delta",
      "reasoning-end",
      "text-start",
      "text-delta",
      "text-end",
      "finish-step",
      "finish",
    ]);
  });

  it("思考を閉じるとき、思考にかかった時間を添える", () => {
    let time = 1000;
    const converter = createEventConverter(() => time);
    converter.push({ type: "reasoning", text: "ええと" });
    time = 4200;
    const chunks = converter.push({ type: "delta", text: "答え" });

    const end = chunks.find((c) => c.type === "reasoning-end");
    expect(end).toMatchObject({
      providerMetadata: { openUi: { reasoningMs: 3200 } },
    });
  });

  it("何も受け取らずに完了しても、開始から終了まで揃える", () => {
    expect(convert([{ type: "done" }]).map((c) => c.type)).toEqual([
      "start",
      "start-step",
      "finish-step",
      "finish",
    ]);
  });

  it("何も受け取る前の失敗では、メッセージを作らずエラーだけ返す", () => {
    expect(convert([{ type: "error", message: "接続できません" }])).toEqual([
      { type: "error", errorText: "接続できません" },
    ]);
  });

  it("途中の失敗では、開いているパーツを閉じてからエラーを返す", () => {
    const chunks = convert([
      { type: "delta", text: "途中" },
      { type: "error", message: "切断されました" },
    ]);

    expect(chunks.slice(-2)).toEqual([
      { type: "text-end", id: "text-0" },
      { type: "error", errorText: "切断されました" },
    ]);
  });

  it("出力の統計を、メッセージのメタデータにする", () => {
    const chunks = convert([
      { type: "delta", text: "こんにちは" },
      { type: "stats", tokens: 42, elapsedMs: 1500, estimated: false },
      { type: "done" },
    ]);

    expect(chunks).toContainEqual({
      type: "message-metadata",
      messageMetadata: {
        stats: { tokens: 42, elapsedMs: 1500, estimated: false },
      },
    });
    // 本文の終了と完了は、これまでどおり揃う
    expect(chunks.at(-1)).toEqual({ type: "finish" });
    expect(chunks.filter((chunk) => chunk.type === "text-end")).toHaveLength(1);
  });

  it("メッセージを始める前の統計は無視する", () => {
    expect(
      createEventConverter().push({
        type: "stats",
        tokens: 1,
        elapsedMs: 1,
        estimated: true,
      }),
    ).toEqual([]);
  });

  it("終了後のイベントは無視する", () => {
    const converter = createEventConverter();
    converter.push({ type: "done" });

    expect(converter.push({ type: "delta", text: "遅れて届いた" })).toEqual([]);
  });
});
