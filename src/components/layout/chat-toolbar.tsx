import { PanelLeftIcon, SquarePenIcon } from "lucide-react";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
} from "@/components/layout/toolbar";
import { useSidebar } from "@/components/ui/sidebar";
import { useConversationTitle } from "@/hooks/use-history";

interface ChatToolbarProps {
  conversationId: string;
  onNewChat: () => void;
}

/** チャット画面のツールバー。サイドバーの開閉、会話のタイトル、新規チャット。 */
export function ChatToolbar({ conversationId, onNewChat }: ChatToolbarProps) {
  const { toggleSidebar } = useSidebar();
  const title = useConversationTitle(conversationId);

  return (
    <Toolbar>
      <ToolbarGroup>
        <ToolbarButton
          label="サイドバーを切り替え"
          shortcut="toggleSidebar"
          onClick={toggleSidebar}
        >
          <PanelLeftIcon />
        </ToolbarButton>
      </ToolbarGroup>
      {/* 押してもドラッグの邪魔をしないよう、ポインタを通す */}
      <p className="pointer-events-none min-w-0 flex-1 truncate px-1 text-mac-headline font-semibold text-mac-label">
        {title}
      </p>
      <ToolbarGroup>
        <ToolbarButton
          label="新規チャット"
          shortcut="newChat"
          onClick={onNewChat}
        >
          <SquarePenIcon />
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );
}
