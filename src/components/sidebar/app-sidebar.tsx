import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { ShortcutHint } from "@/components/common/shortcut-hint";
import { DeleteDialog } from "@/components/sidebar/delete-dialog";
import { HistoryList } from "@/components/sidebar/history-list";
import { RenameDialog } from "@/components/sidebar/rename-dialog";
import { SearchField } from "@/components/ui/search-field";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useHistoryList } from "@/hooks/use-history";
import { groupByDate } from "@/lib/history-groups";
import { filterByTitle } from "@/lib/history-search";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsDialogStore } from "@/stores/settings-dialog-store";
import type { ConversationSummary } from "@/types/bindings";

/** 履歴の検索欄の `id`。ショートカットでここに移る。 */
export const HISTORY_SEARCH_ID = "history-search";

/**
 * 左に浮かぶサイドバー。タイトル検索・日付ごとの履歴・設定ボタンを出す。
 * macOSでは上端に信号機ボタンが載るので、検索欄をツールバーの高さまで下げる。
 */
export function AppSidebar() {
  const history = useHistoryList();
  const activeId = useConversationStore((state) => state.activeId);
  const open = useConversationStore((state) => state.open);
  const startNew = useConversationStore((state) => state.startNew);
  const showSettings = useSettingsDialogStore((state) => state.show);
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
      <Sidebar
        variant="floating"
        className="[&>[data-slot=sidebar-inner]]:rounded-[var(--mac-radius-window)] [&>[data-slot=sidebar-inner]]:mac-material-sidebar"
      >
        <SidebarHeader
          data-tauri-drag-region
          className="px-2.5 pt-2.5 pb-1 mac:pt-11"
        >
          <SearchField
            id={HISTORY_SEARCH_ID}
            variant="filled"
            size="lg"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="検索"
            aria-label="履歴をタイトルで検索"
            autoComplete="off"
          />
        </SidebarHeader>
        <SidebarContent className="px-1">
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
        <SidebarFooter className="px-2.5 pt-1 pb-2.5">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-7 px-2 text-(length:--text-mac-body) hover:bg-mac-fill-quaternary"
                onClick={() => {
                  showSettings();
                  afterNavigate();
                }}
              >
                <SettingsIcon className="text-mac-label-secondary" />
                <span className="flex-1 truncate">設定</span>
                <ShortcutHint
                  id="openSettings"
                  className="opacity-0 transition-opacity group-hover/menu-button:opacity-100"
                />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
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
