import { type CSSProperties, type ReactNode, useState } from "react";
import { AppShortcuts } from "@/components/layout/app-shortcuts";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UpdateDialog } from "@/components/update/update-dialog";
import { useUiSettings, useUpdateUiSettings } from "@/hooks/use-ui-settings";

/**
 * アプリ全体の枠。左に浮かぶサイドバー、残りに画面(`children`)を置く。
 * サイドバーの開閉は、前回の状態を設定ファイルから読み、変えるたびに保存する。
 */
export function AppShell({ children }: { children: ReactNode }) {
  const settings = useUiSettings();

  // 読み込みが終わってから描く(開閉が一瞬ちらつかないように)。読めなければ既定で開く
  if (settings.isPending) return null;
  return (
    <Shell sidebarOpen={settings.data?.sidebarOpen ?? true}>{children}</Shell>
  );
}

function Shell({
  sidebarOpen,
  children,
}: {
  sidebarOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(sidebarOpen);
  const update = useUpdateUiSettings();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // 他の設定(テーマなど)は、いまの値のまま残る
    update.mutate({ sidebarOpen: next });
  };

  return (
    <SidebarProvider
      open={open}
      onOpenChange={handleOpenChange}
      className="h-svh min-h-0 bg-mac-window"
      style={
        { "--sidebar-width": "var(--sidebar-panel-width)" } as CSSProperties
      }
    >
      <AppShortcuts />
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 bg-mac-window">
        {children}
      </SidebarInset>
      <SettingsDialog />
      {/* 開発中(`pnpm tauri dev`)は更新を確認しない。インストールできないため */}
      <UpdateDialog enabled={!import.meta.env.DEV} />
    </SidebarProvider>
  );
}
