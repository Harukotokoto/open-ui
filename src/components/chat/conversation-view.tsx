import type { UIMessage } from "ai";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/composer/composer";
import { ModelSelector } from "@/components/composer/model-selector";
import { Welcome } from "@/components/welcome/welcome";
import { useAutosaveConversation } from "@/hooks/use-autosave-conversation";
import { useChatSession } from "@/hooks/use-chat-session";
import { useActiveProfile } from "@/hooks/use-profiles";

interface ConversationViewProps {
  id: string;
  initialMessages?: UIMessage[];
  onOpenSettings: () => void;
}

/**
 * 1つの会話の表示。会話が空ならWelcome、あれば会話の列と下の入力欄を出す。
 * 状態(メッセージ・生成中か)はこの中が持つので、会話を切り替えるときは `key` で作り直す。
 */
export function ConversationView({
  id,
  initialMessages,
  onOpenSettings,
}: ConversationViewProps) {
  const { profile } = useActiveProfile();
  const session = useChatSession(profile?.id, { id, initialMessages });
  useAutosaveConversation(id, session.messages, session.status);

  const composer = (
    <Composer
      onSend={(text) => void session.send(text)}
      onStop={() => void session.stop()}
      busy={session.isBusy}
      sendDisabled={profile === undefined}
      autoFocus
      actions={profile ? <ModelSelector profile={profile} /> : null}
    />
  );

  if (session.messages.length === 0) {
    return <Welcome>{composer}</Welcome>;
  }

  return (
    <>
      <div className="min-h-0 flex-1">
        <MessageList
          messages={session.messages}
          busy={session.isBusy}
          error={session.error}
          onRetry={() => void session.retry()}
          onOpenSettings={onOpenSettings}
        />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">{composer}</div>
    </>
  );
}
