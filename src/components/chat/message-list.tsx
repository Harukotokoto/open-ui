import type { UIMessage } from "ai";
import { ArrowDownIcon } from "lucide-react";
import { AssistantMessage } from "@/components/chat/assistant-message";
import { ChatError } from "@/components/chat/chat-error";
import { UserMessage } from "@/components/chat/user-message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Spinner } from "@/components/ui/spinner";

interface MessageListProps {
  /** 添付の置き場になる会話のID。 */
  conversationId: string;
  messages: UIMessage[];
  /** 返答の生成中か。 */
  busy: boolean;
  error: Error | undefined;
  onRetry: () => void;
  onOpenSettings: () => void;
  /** 会話の下端に浮かべておくもの(入力欄)。会話はこの下を通ってスクロールする。 */
  footer?: React.ReactNode;
}

/** 会話の列。ユーザーの発言を基準に、返答へ自動で追従する。 */
export function MessageList({
  conversationId,
  messages,
  busy,
  error,
  onRetry,
  onOpenSettings,
  footer,
}: MessageListProps) {
  const last = messages.at(-1);
  // 返答の最初の一文字が届くまでの間は、待っていることを示す
  const waiting =
    busy &&
    (last?.role === "user" ||
      (last?.role === "assistant" && last.parts.length === 0));

  return (
    <MessageScrollerProvider autoScroll>
      <MessageScroller>
        {/* 上端はツールバーの下で内容が消えていく(`--scroll-fade-size`)。切れ目が見えないようにする */}
        <MessageScrollerViewport className="mask-[linear-gradient(to_bottom,transparent,black_var(--scroll-fade-size))]">
          <MessageScrollerContent
            aria-busy={busy}
            className="mx-auto w-full max-w-(--chat-column-width) gap-7 px-5 pt-4"
          >
            {messages.map((message) =>
              message.role === "user" ? (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor
                >
                  <UserMessage
                    conversationId={conversationId}
                    message={message}
                  />
                </MessageScrollerItem>
              ) : message.parts.length === 0 ? null : (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <AssistantMessage
                    message={message}
                    streaming={busy && message === last}
                  />
                </MessageScrollerItem>
              ),
            )}
            {waiting && (
              <div className="text-mac-label-secondary" role="status">
                <Spinner />
                <span className="sr-only">返答を待っています</span>
              </div>
            )}
            {error && (
              <ChatError
                error={error}
                onRetry={onRetry}
                onOpenSettings={onOpenSettings}
              />
            )}
            {/* 下端に貼りつく。下半分だけ窓の色で埋め、注意書きの後ろを会話が透けないようにする */}
            <div className="sticky bottom-0 mt-auto bg-linear-to-t from-mac-window from-30% to-transparent pt-2 pb-3">
              {/* 背景と同じ色の丸では見えないので、入力欄と同じガラスにして影で浮かせる */}
              <MessageScrollerButton
                variant="ghost"
                size="icon-lg"
                className="bg-mac-glass! text-mac-label-secondary shadow-[0_0_0_0.5px_var(--mac-border),0_4px_12px_rgb(0_0_0/0.16)] hover:text-mac-label data-[direction=end]:bottom-[calc(100%+0.75rem)]"
              >
                <ArrowDownIcon />
                <span className="sr-only">最新のメッセージへ移動</span>
              </MessageScrollerButton>
              {footer}
            </div>
          </MessageScrollerContent>
        </MessageScrollerViewport>
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
