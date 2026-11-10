import { Chat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { buildFormatGuide } from "@/lib/markdown/custom-tags";
import type { AutosaveRequest } from "./autosaver";
import { cancelChat, startChat } from "./ipc";
import { ChatSessionRegistry } from "./session-registry";
import { TauriChatTransport } from "./transport";

const backend = { start: startChat, cancel: cancelChat };
/** 画面が描ける書式(Markdownと独自タグ)をAIに伝える説明。常に付ける。 */
const FORMAT_GUIDE = buildFormatGuide();

/** 画面が用意できてから差し込むもの。送信・保存のたびに最新を使う。 */
export interface SessionHandlers {
  /** いま使う接続先。 */
  getProfileId: () => string | undefined;
  save: (request: AutosaveRequest) => void;
}

let handlers: SessionHandlers = {
  getProfileId: () => undefined,
  save: () => console.error("会話の保存先がまだ用意できていません"),
};

/** 画面の準備ができたら、接続先と保存のしかたを差し込む。 */
export function bindChatSessions(next: SessionHandlers) {
  handlers = next;
}

/** アプリ全体で1つ。会話の生成を、画面の切り替えと関係なく持ち続ける。 */
export const chatSessions = new ChatSessionRegistry<Chat<UIMessage>>({
  createChat: ({ id, messages }) =>
    new Chat<UIMessage>({
      id,
      messages,
      transport: new TauriChatTransport(
        backend,
        () => handlers.getProfileId() ?? "",
        () => FORMAT_GUIDE,
      ),
    }),
  deps: {
    save: (request) => handlers.save(request),
    getProfileId: () => handlers.getProfileId(),
  },
});
