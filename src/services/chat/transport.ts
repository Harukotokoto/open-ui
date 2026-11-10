import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { errorMessage } from "@/services/ipc";
import type { ChatEvent, ChatRequest } from "@/types/bindings";
import { createEventConverter, toWireMessages } from "./convert";

/** Rust とのやり取り。テストで差し替えられるよう、外から渡す。 */
export interface ChatBackend {
  start(
    request: ChatRequest,
    onEvent: (event: ChatEvent) => void,
  ): Promise<void>;
  cancel(requestId: string): Promise<void>;
}

type SendOptions = Parameters<ChatTransport<UIMessage>["sendMessages"]>[0];

/**
 * AI SDK の `useChat` を、Rust 経由のチャットにつなぐ `ChatTransport`。
 * サーバーのURL・APIキー・モデルは持たない。`profileId` だけを渡し、Rust が引く。
 */
export class TauriChatTransport implements ChatTransport<UIMessage> {
  constructor(
    private readonly backend: ChatBackend,
    private readonly getProfileId: () => string,
    /** 画面が描ける書式の説明。AIに伝える(Rustがシステムプロンプトの後ろに足す)。 */
    private readonly getFormatGuide: () => string | undefined = () => undefined,
  ) {}

  async sendMessages({
    chatId,
    messages,
    abortSignal,
  }: SendOptions): Promise<ReadableStream<UIMessageChunk>> {
    const requestId = crypto.randomUUID();
    const converter = createEventConverter();
    let controller: ReadableStreamDefaultController<UIMessageChunk> | undefined;
    let closed = false;

    const cancel = () => {
      void this.backend.cancel(requestId).catch(() => undefined);
    };

    const close = () => {
      if (closed) return;
      closed = true;
      controller?.close();
    };

    const onEvent = (event: ChatEvent) => {
      if (closed) return;
      for (const chunk of converter.push(event)) {
        controller?.enqueue(chunk);
      }
      if (event.type === "done" || event.type === "error") {
        close();
      }
    };

    const stream = new ReadableStream<UIMessageChunk>({
      start(c) {
        controller = c;
      },
      // 受け手が読むのをやめたら、生成も止める
      cancel() {
        closed = true;
        cancel();
      },
    });

    abortSignal?.addEventListener("abort", cancel, { once: true });

    this.backend
      .start(
        {
          requestId,
          profileId: this.getProfileId(),
          // 会話のID。添付の置き場を指す
          conversationId: chatId,
          messages: toWireMessages(messages),
          formatGuide: this.getFormatGuide(),
        },
        onEvent,
      )
      .catch((error: unknown) =>
        onEvent({ type: "error", message: errorMessage(error) }),
      );

    return stream;
  }

  /** 接続し直さない。 */
  async reconnectToStream(): Promise<null> {
    return null;
  }
}
