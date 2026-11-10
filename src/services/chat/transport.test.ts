import type { UIMessage, UIMessageChunk } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { ChatEvent, ChatRequest } from "@/types/bindings";
import { type ChatBackend, TauriChatTransport } from "./transport";

const userMessage: UIMessage = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "やあ" }],
};

async function readAll(stream: ReadableStream<UIMessageChunk>) {
  const chunks: UIMessageChunk[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return chunks;
    chunks.push(value);
  }
}

function setup(script: (onEvent: (event: ChatEvent) => void) => void) {
  const requests: ChatRequest[] = [];
  const backend: ChatBackend = {
    start: vi.fn(async (request, onEvent) => {
      requests.push(request);
      script(onEvent);
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
  const transport = new TauriChatTransport(backend, () => "default");
  return { backend, requests, transport };
}

describe("TauriChatTransport", () => {
  it("プロファイルIDと本文だけをRustに渡し、イベントをチャンクにして流す", async () => {
    const { requests, transport } = setup((onEvent) => {
      onEvent({ type: "delta", text: "はい" });
      onEvent({ type: "done" });
    });

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "c1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: undefined,
    });
    const chunks = await readAll(stream);

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      profileId: "default",
      conversationId: "c1",
      messages: [{ role: "user", content: "やあ" }],
    });
    expect(chunks.map((c) => c.type)).toContain("text-delta");
    expect(chunks.at(-1)).toEqual({ type: "finish" });
  });

  it("書式の説明があれば、リクエストに付ける", async () => {
    const requests: ChatRequest[] = [];
    const backend: ChatBackend = {
      start: vi.fn(async (request, onEvent) => {
        requests.push(request);
        onEvent({ type: "done" });
      }),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const transport = new TauriChatTransport(
      backend,
      () => "default",
      () => "書式の説明",
    );

    await readAll(
      await transport.sendMessages({
        trigger: "submit-message",
        chatId: "c1",
        messageId: undefined,
        messages: [userMessage],
        abortSignal: undefined,
      }),
    );

    expect(requests[0]?.formatGuide).toBe("書式の説明");
  });

  it("コマンド自体が失敗したら、エラーのチャンクで伝える", async () => {
    const backend: ChatBackend = {
      start: vi.fn().mockRejectedValue(new Error("通信できません")),
      cancel: vi.fn().mockResolvedValue(undefined),
    };
    const transport = new TauriChatTransport(backend, () => "default");

    const stream = await transport.sendMessages({
      trigger: "submit-message",
      chatId: "c1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: undefined,
    });

    expect(await readAll(stream)).toEqual([
      { type: "error", errorText: "通信できません" },
    ]);
  });

  it("中断されたら、同じIDで中断を依頼する", async () => {
    const { backend, requests, transport } = setup(() => {});
    const controller = new AbortController();

    await transport.sendMessages({
      trigger: "submit-message",
      chatId: "c1",
      messageId: undefined,
      messages: [userMessage],
      abortSignal: controller.signal,
    });
    controller.abort();

    expect(backend.cancel).toHaveBeenCalledWith(requests[0]?.requestId);
  });

  it("再接続はしない", async () => {
    const { transport } = setup(() => {});

    expect(await transport.reconnectToStream()).toBeNull();
  });
});
