import type { UIMessage } from "ai";
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
}

/** 会話の列。ユーザーの発言を基準に、返答へ自動で追従する。 */
export function MessageList({
  conversationId,
  messages,
  busy,
  error,
  onRetry,
  onOpenSettings,
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
        <MessageScrollerViewport>
          <MessageScrollerContent
            aria-busy={busy}
            className="mx-auto w-full max-w-3xl px-4 py-6"
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
              <div className="text-muted-foreground" role="status">
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
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
