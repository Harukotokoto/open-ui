import type { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import {
  type AutosaveDeps,
  ConversationAutosaver,
  type ObservableChat,
} from "./autosaver";

/** 生成の状態を持つ会話。`Chat` のうち、レジストリが使う部分。 */
export interface ManagedChat extends ObservableChat {
  dispose: () => Promise<void>;
}

interface Session<C extends ManagedChat> {
  chat: C;
  autosaver: ConversationAutosaver;
}

export interface ChatSessionRegistryOptions<C extends ManagedChat> {
  /** 会話を作る。 */
  createChat: (init: { id: string; messages?: UIMessage[] }) => C;
  /** 保存と、タイトルを考えさせる接続先。画面が用意できてから `bind` で差し込む。 */
  deps: AutosaveDeps;
}

/**
 * 開いたことのある会話の生成を、画面とは別に持っておく置き場。
 *
 * 画面(`ConversationView`)は、会話を切り替えるたびに作り直される。生成中の `Chat` を画面に持たせると、
 * 切り替えで生成が途切れてしまう。そこで `Chat` をここで持ち、画面は借りるだけにする。
 * 生成を止めるのは、利用者が停止したとき・会話を削除したときだけ(アプリを閉じれば通信ごと終わる)。
 */
export class ChatSessionRegistry<C extends ManagedChat = Chat<UIMessage>> {
  private readonly sessions = new Map<string, Session<C>>();

  constructor(private readonly options: ChatSessionRegistryOptions<C>) {}

  has(id: string) {
    return this.sessions.has(id);
  }

  /**
   * 会話を借りる。無ければ `initialMessages` から作る。あれば(生成中でも)そのまま返す。
   * 何度呼んでも同じ会話が返る(再描画で作り直さない)。
   */
  acquire(id: string, initialMessages?: UIMessage[]): C {
    const existing = this.sessions.get(id);
    if (existing) return existing.chat;

    const chat = this.options.createChat({ id, messages: initialMessages });
    const autosaver = new ConversationAutosaver(id, chat, this.options.deps);
    this.sessions.set(id, { chat, autosaver });
    return chat;
  }

  /**
   * `keepId` と、生成中の会話以外を手放す(未保存の分は保存する)。
   * 開き直すときは、保存したファイルから読み込む。
   */
  prune(keepId: string) {
    for (const [id, session] of this.sessions) {
      if (id === keepId || isBusy(session.chat)) continue;
      this.sessions.delete(id);
      session.autosaver.dispose({ save: true });
      void session.chat.dispose().catch(() => undefined);
    }
  }

  /**
   * 会話を手放し、生成中なら止める。保存はしない(削除したあとにファイルを書き戻さないため)。
   */
  async dispose(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    this.sessions.delete(id);
    session.autosaver.dispose({ save: false });
    await session.chat.dispose().catch(() => undefined);
  }

  /** すべて手放し、生成中のものは止める。保存はしない。テストの後片付け用。 */
  async disposeAll() {
    await Promise.all([...this.sessions.keys()].map((id) => this.dispose(id)));
  }
}

function isBusy(chat: ObservableChat) {
  return chat.status === "submitted" || chat.status === "streaming";
}
