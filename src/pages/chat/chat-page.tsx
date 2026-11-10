import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { ConversationLoadError } from "@/components/chat/conversation-load-error";
import { ConversationView } from "@/components/chat/conversation-view";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useConversation } from "@/hooks/use-history";
import { useActiveProfile } from "@/hooks/use-profiles";
import { useConversationStore } from "@/stores/conversation-store";

/**
 * チャット画面。いま開いている会話を表示する。
 * 保存済みの会話は読み込んでから開き、会話が変わるたびに `ConversationView` を作り直す。
 */
export function ChatPage() {
  const { profile } = useActiveProfile();
  const activeId = useConversationStore((state) => state.activeId);
  const existing = useConversationStore((state) => state.existing);
  const startNew = useConversationStore((state) => state.startNew);
  const conversation = useConversation(activeId, existing);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  }

  return (
    <div className="flex h-svh min-h-0 flex-col">
      <header className="flex items-center justify-between px-3 py-2">
        <SidebarTrigger />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon />
          {profile?.name ?? "接続設定"}
        </Button>
      </header>

      {body}

      <ConnectionDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
