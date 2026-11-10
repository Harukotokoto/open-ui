import type { ChatStatus, UIMessage } from "ai";
import { hasAssistantReply, toStoredMessages } from "@/lib/stored-messages";

/** 自動保存が見張る会話。`@ai-sdk/react` の `Chat` がこの形を満たす。 */
export interface ObservableChat {
  readonly messages: UIMessage[];
  readonly status: ChatStatus;
  "~registerMessagesCallback": (
    onChange: () => void,
    throttleWaitMs?: number,
  ) => () => void;
  "~registerStatusCallback": (onChange: () => void) => () => void;
}

export interface AutosaveRequest {
  id: string;
  messages: unknown[];
  /** 指定すると、保存できたあとにこの接続先のモデルでAIにタイトルを考えさせる。 */
  titleProfileId?: string;
}

export interface AutosaveDeps {
  save: (request: AutosaveRequest) => void;
  /** タイトルを考えさせる接続先。 */
  getProfileId: () => string | undefined;
}

/**
 * 会話を自動で保存する。画面(React)ではなく会話そのものにつなぐので、
 * 別の会話を開いて画面から外れたあとも、生成が終わるまで保存が続く。
 *
 * 送信した直後(落ちても発言が残るように)と、返答が終わったとき(完了・停止・失敗)に、
 * その時点の会話をまるごと保存する。生成中は保存しない(文字が届くたびに書き込まないため)。
 * 開いただけの会話は保存しない(更新日時が変わって、一覧の順が入れ替わらないように)。
 *
 * 新しい会話は、最初の返答が終わった保存のあとに、AIにタイトルを考えさせる(1つの会話につき1回)。
 * 開いた履歴の会話や、返答が無い(失敗した)会話では生成しない。
 */
export class ConversationAutosaver {
  /** 最後に保存した(または開いた)時点のメッセージ。配列の同一性で、変更があったかを見る。 */
  private saved: UIMessage[];
  private wantsTitle: boolean;
  private readonly unsubscribe: () => void;
  private disposed = false;

  constructor(
    private readonly id: string,
    private readonly chat: ObservableChat,
    private readonly deps: AutosaveDeps,
  ) {
    this.saved = chat.messages;
    // タイトルを考えさせるのは、新しい会話(開いた時点で空)だけ
    this.wantsTitle = chat.messages.length === 0;

    const check = () => {
      if (chat.status !== "streaming") this.flush(chat.status === "ready");
    };
    const unsubscribes = [
      chat["~registerMessagesCallback"](check),
      chat["~registerStatusCallback"](check),
    ];
    this.unsubscribe = () => {
      for (const off of unsubscribes) off();
    };
  }

  /**
   * 見張りをやめる。`save` が真なら、未保存の分を保存する(タイトルは頼まない)。
   * 会話を削除するときは偽にする(削除したファイルを書き戻さないため)。
   */
  dispose({ save }: { save: boolean }) {
    if (this.disposed) return;
    if (save) this.flush(false);
    this.disposed = true;
    this.unsubscribe();
  }

  private flush(replyFinished: boolean) {
    if (this.disposed) return;
    const current = this.chat.messages;
    if (current === this.saved || current.length === 0) return;
    this.saved = current;

    let titleProfileId: string | undefined;
    const profileId = this.deps.getProfileId();
    if (
      replyFinished &&
      this.wantsTitle &&
      profileId !== undefined &&
      hasAssistantReply(current)
    ) {
      this.wantsTitle = false;
      titleProfileId = profileId;
    }
    this.deps.save({
      id: this.id,
      messages: toStoredMessages(current),
      titleProfileId,
    });
  }
}
