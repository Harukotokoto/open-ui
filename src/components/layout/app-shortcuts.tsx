import { HISTORY_SEARCH_ID } from "@/components/sidebar/app-sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import { useAppShortcuts } from "@/hooks/use-app-shortcuts";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsDialogStore } from "@/stores/settings-dialog-store";

/** アプリ全体のショートカット(新規チャット・設定・履歴の検索)をつなぐ。何も描かない。 */
export function AppShortcuts() {
  const startNew = useConversationStore((state) => state.startNew);
  const showSettings = useSettingsDialogStore((state) => state.show);
  const { isMobile, setOpen, setOpenMobile } = useSidebar();

  useAppShortcuts({
    newChat: startNew,
    openSettings: () => showSettings(),
    search: () => {
      // 閉じていたら開いてから、描かれるのを待って検索欄に移る
      if (isMobile) setOpenMobile(true);
      else setOpen(true);
      requestAnimationFrame(() => {
        const input = document.getElementById(HISTORY_SEARCH_ID);
        if (input instanceof HTMLInputElement) {
          input.focus();
          input.select();
        }
      });
    },
  });

  return null;
}
