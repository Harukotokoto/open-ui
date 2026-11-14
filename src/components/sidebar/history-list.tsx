import { HistoryItem } from "@/components/sidebar/history-item";
import { Button } from "@/components/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import type { HistoryGroup } from "@/lib/history-groups";
import { errorMessage } from "@/services/ipc";
import type { ConversationSummary } from "@/types/bindings";

interface HistoryListProps {
  groups: HistoryGroup[];
  activeId: string;
  /** 読み込み中か。 */
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** 保存済みの会話が1件もないか(検索で絞った結果が空のときとは区別する)。 */
  isEmpty: boolean;
  /** 一部のファイルを読めずに一覧から外した件数。 */
  skipped: number;
  onOpen: (id: string) => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
}

/** 日付ごとにまとめた履歴の一覧。読み込み中・失敗・空のときの表示も持つ。 */
export function HistoryList({
  groups,
  activeId,
  loading,
  error,
  onRetry,
  isEmpty,
  skipped,
  onOpen,
  onRename,
  onDelete,
}: HistoryListProps) {
  if (loading) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          {[0, 1, 2, 3, 4].map((index) => (
            <SidebarMenuItem key={index}>
              <SidebarMenuSkeleton />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  if (error) {
    return (
      <SidebarGroup>
        <p className="px-2 text-mac-body text-mac-red">
          履歴を読み込めませんでした。{errorMessage(error)}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mx-2 mt-2 self-start"
          onClick={onRetry}
        >
          再読み込み
        </Button>
      </SidebarGroup>
    );
  }

  const skippedNote = skipped > 0 && (
    <p className="px-4 pb-2 text-mac-subheadline text-mac-label-secondary">
      読み込めない履歴が{skipped}件あります(ファイルはそのまま残しています)。
    </p>
  );

  if (groups.length === 0) {
    return (
      <>
        <SidebarGroup>
          <p className="px-2 py-1 text-mac-body text-mac-label-secondary">
            {isEmpty ? "履歴はまだありません" : "見つかりませんでした"}
          </p>
        </SidebarGroup>
        {skippedNote}
      </>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id} className="py-1">
          <SidebarGroupLabel className="h-6 font-semibold text-mac-label-secondary">
            {group.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((conversation) => (
                <HistoryItem
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === activeId}
                  onOpen={onOpen}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
      {skippedNote}
    </>
  );
}
