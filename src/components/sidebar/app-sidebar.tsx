import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { DeleteDialog } from "@/components/sidebar/delete-dialog";
import { HistoryList } from "@/components/sidebar/history-list";
import { RenameDialog } from "@/components/sidebar/rename-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useHistoryList } from "@/hooks/use-history";
import { groupByDate } from "@/lib/history-groups";
import { filterByTitle } from "@/lib/history-search";
import { useConversationStore } from "@/stores/conversation-store";
import type { ConversationSummary } from "@/types/bindings";

/** 左のサイドバー。新規チャット・タイトル検索・日付ごとの履歴を出す。 */
export function AppSidebar() {
  const history = useHistoryList();
  const activeId = useConversationStore((state) => state.activeId);
  const open = useConversationStore((state) => state.open);
  const startNew = useConversationStore((state) => state.startNew);
  const { isMobile, setOpenMobile } = useSidebar();

  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null);
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null);

  const conversations = history.data?.conversations ?? [];
  const groups = groupByDate(filterByTitle(conversations, query), new Date());

  // 狭い画面では、サイドバーは重ねて出す。選んだら閉じて会話を見せる
  const afterNavigate = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader className="m-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  startNew();
                  afterNavigate();
                }}
              >
                <PlusIcon />
                <span>新規チャット</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="タイトルで検索"
            aria-label="履歴をタイトルで検索"
            autoComplete="off"
            className="rounded-sm"
          />
        </SidebarHeader>
        <SidebarContent className="m-1">
          <HistoryList
            groups={groups}
            activeId={activeId}
            loading={history.isPending}
            error={history.error}
            onRetry={() => void history.refetch()}
            isEmpty={conversations.length === 0}
            skipped={history.data?.skipped ?? 0}
            onOpen={(id) => {
              open(id);
              afterNavigate();
            }}
            onRename={setRenaming}
            onDelete={setDeleting}
          />
        </SidebarContent>
      </Sidebar>

      {/* 狭い画面ではサイドバーが閉じると中身が消えるので、ダイアログは外に置く */}
      <RenameDialog conversation={renaming} onClose={() => setRenaming(null)} />
      <DeleteDialog
        conversation={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          // 開いていた会話を消したら、新しい会話に移る
          if (useConversationStore.getState().activeId === id) startNew();
        }}
      />
    </>
  );
}
