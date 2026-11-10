import { type ReactNode, useState } from "react";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useUiSettings, useUpdateUiSettings } from "@/hooks/use-ui-settings";
import type { UiSettings } from "@/types/bindings";

/**
 * アプリ全体の枠。左にサイドバー、残りに画面(`children`)を置く。
 * サイドバーの開閉は、前回の状態を設定ファイルから読み、変えるたびに保存する。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const settings = useUiSettings();

  // 読み込みが終わってから描く(開閉が一瞬ちらつかないように)。読めなければ既定で開く
  if (settings.isPending) return null;
  return <Shell settings={settings.data ?? {}}>{children}</Shell>;
}

function Shell({
  settings,
  children,
}: {
  settings: UiSettings;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(settings.sidebarOpen ?? true);
  const update = useUpdateUiSettings();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    update.mutate({ ...settings, sidebarOpen: next });
  };

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
