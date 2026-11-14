import type { ReactNode } from "react";
import { ShortcutHint } from "@/components/common/shortcut-hint";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ShortcutId } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

/**
 * ウィンドウ上端のツールバー。ドラッグでウィンドウを動かせる(中のボタンは除く)。
 * macOSでサイドバーを閉じているあいだは、信号機ボタンがここにかかるので左を空ける。
 */
export function Toolbar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { open, isMobile } = useSidebar();
  const coversTrafficLights = !open || isMobile;
  return (
    <header
      data-tauri-drag-region
      className={cn(
        "flex h-(--toolbar-height) shrink-0 items-center gap-2 px-3 select-none",
        coversTrafficLights && "mac:pl-(--traffic-lights-inset)",
        className,
      )}
    >
      {children}
    </header>
  );
}

/** ツールバーの中で、ボタンをまとめて載せるガラスのカプセル。 */
export function ToolbarGroup({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-full p-0.5 glass-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ToolbarButtonProps {
  /** 読み上げとヘルプタグに出す名前 */
  label: string;
  shortcut?: ShortcutId;
  onClick: () => void;
  children: ReactNode;
}

/** ツールバーのアイコンボタン。ポインタを載せると名前とショートカットを出す。 */
export function ToolbarButton({
  label,
  shortcut,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={label}
            onClick={onClick}
            className="text-mac-label-secondary hover:text-mac-label [&_svg:not([class*='size-'])]:size-[17px]"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="flex items-center gap-2"
      >
        {label}
        {shortcut && <ShortcutHint id={shortcut} />}
      </TooltipContent>
    </Tooltip>
  );
}
