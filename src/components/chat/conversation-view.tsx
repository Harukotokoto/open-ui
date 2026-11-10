import type { UIMessage } from "ai";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/composer/composer";
import { ModelSelector } from "@/components/composer/model-selector";
import { Welcome } from "@/components/welcome/welcome";
import { useAutosaveConversation } from "@/hooks/use-autosave-conversation";
import { useChatSession } from "@/hooks/use-chat-session";
import { useActiveProfile } from "@/hooks/use-profiles";

/** 会話の途中の入力欄の下に出す注意書き。 */
const AI_NOTICE = "AIは間違えることがあります。回答は必ずご確認ください。";

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
  useAutosaveConversation(id, session.messages, session.status, profile?.id);

  const composerProps = {
    onSend: (text: string) => void session.send(text),
    onStop: () => void session.stop(),
    busy: session.isBusy,
    sendDisabled: profile === undefined,
    autoFocus: true,
  };

  if (session.messages.length === 0) {
    return (
      <Welcome>
        <Composer {...composerProps} actions={<ModelSelector />} />
      </Welcome>
    );
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
      <div className="mx-auto w-full max-w-3xl px-4 pb-3">
        {/* 会話の途中は、1行のスリムな入力欄。モデルの選択は下の段に置く */}
        <Composer
          {...composerProps}
          variant="compact"
          hint={AI_NOTICE}
          actions={<ModelSelector className="h-6 px-1.5 text-xs" />}
        />
      </div>
    </>
  );
}
