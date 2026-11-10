import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/composer/composer";
import { ModelSelector } from "@/components/composer/model-selector";
import { ConnectionDialog } from "@/components/settings/connection-dialog";
import { Button } from "@/components/ui/button";
import { Welcome } from "@/components/welcome/welcome";
import { useChatSession } from "@/hooks/use-chat-session";
import { useActiveProfile } from "@/hooks/use-profiles";

/** チャット画面。会話が空ならWelcome、あれば会話の列と下の入力欄を出す。 */
export function ChatPage() {
  const { profile } = useActiveProfile();
  const session = useChatSession(profile?.id);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  return (
    <main className="flex h-svh min-h-0 flex-col">
      <header className="flex justify-end px-3 py-2">
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

      {session.messages.length === 0 ? (
        <Welcome>{composer}</Welcome>
      ) : (
        <>
          <div className="min-h-0 flex-1">
            <MessageList
              messages={session.messages}
              busy={session.isBusy}
              error={session.error}
              onRetry={() => void session.retry()}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
          <div className="mx-auto w-full max-w-3xl px-4 pb-4">{composer}</div>
        </>
      )}

      <ConnectionDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}
