import { ConversationLoadError } from "@/components/chat/conversation-load-error";
import { ConversationView } from "@/components/chat/conversation-view";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useConversation } from "@/hooks/use-history";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsDialogStore } from "@/stores/settings-dialog-store";

/**
 * チャット画面。いま開いている会話を表示する。
 * 保存済みの会話は読み込んでから開き、会話が変わるたびに `ConversationView` を作り直す。
 */
export function ChatPage() {
  const activeId = useConversationStore((state) => state.activeId);
  const existing = useConversationStore((state) => state.existing);
  const startNew = useConversationStore((state) => state.startNew);
  const conversation = useConversation(activeId, existing);
  const showSettings = useSettingsDialogStore((state) => state.show);

  let body: React.ReactNode;
  if (existing && conversation.isError) {
    body = (
      <ConversationLoadError error={conversation.error} onStartNew={startNew} />
    );
  } else if (existing && conversation.messages === undefined) {
    body = (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  } else {
    body = (
      <ConversationView
        key={activeId}
        id={activeId}
        initialMessages={conversation.messages}
        onOpenSettings={() => showSettings("connection")}
      />
    );
  }

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <header className="flex items-center px-3 py-2">
        <SidebarTrigger />
      </header>

      {body}
    </div>
  );
}
