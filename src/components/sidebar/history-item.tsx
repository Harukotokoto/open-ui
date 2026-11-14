import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { ConversationSummary } from "@/types/bindings";

interface HistoryItemProps {
  conversation: ConversationSummary;
  active: boolean;
  onOpen: (id: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
}

/** 履歴の1行。選ぶと会話を開く。右端のメニューから、名前の変更と削除ができる。 */
export function HistoryItem({
  conversation,
  active,
  onOpen,
  onRename,
  onDelete,
}: HistoryItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        aria-current={active ? "page" : undefined}
        title={conversation.title}
        onClick={() => onOpen(conversation.id)}
        className="h-7 px-2 text-(length:--text-mac-body) hover:bg-mac-fill-quaternary data-active:font-medium data-active:hover:bg-sidebar-accent"
      >
        <span>{conversation.title}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuAction
              showOnHover
              className="top-1 rounded-[5px] text-mac-label-secondary hover:bg-mac-fill-secondary"
            />
          }
          aria-label={`「${conversation.title}」の操作`}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-40">
          <DropdownMenuItem onClick={() => onRename(conversation)}>
            <PencilIcon />
            名前を変更
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(conversation)}
          >
            <Trash2Icon />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
