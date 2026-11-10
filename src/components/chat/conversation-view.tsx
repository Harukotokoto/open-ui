import type { UIMessage } from "ai";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/composer/composer";
import { ModelSelector } from "@/components/composer/model-selector";
import { Welcome } from "@/components/welcome/welcome";
import { useChatSession } from "@/hooks/use-chat-session";
import { useActiveProfile } from "@/hooks/use-profiles";
import type { AttachmentInfo } from "@/types/bindings";

/** 会話の途中の入力欄の下に出す注意書き。 */
const AI_NOTICE = "AIは間違えることがあります。回答は必ずご確認ください。";

interface ConversationViewProps {
  id: string;
  initialMessages?: UIMessage[];
  onOpenSettings: () => void;
}

/**
 * 1つの会話の表示。会話が空ならWelcome、あれば会話の列と下の入力欄を出す。
 * 会話を切り替えるときは `key` で作り直す。会話の状態(メッセージ・生成中か)は `chatSessions` が持つので、
 * 作り直しても生成は続き、戻ってくると続きから見える。
 */
export function ConversationView({
  id,
  initialMessages,
  onOpenSettings,
}: ConversationViewProps) {
  const { profile } = useActiveProfile();
  const session = useChatSession({ id, initialMessages });

  const composerProps = {
    conversationId: id,
    onSend: (text: string, attachments: AttachmentInfo[]) =>
      void session.send(text, attachments),
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
          conversationId={id}
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
