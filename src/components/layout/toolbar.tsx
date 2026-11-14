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
  /**
   * ポインタを載せる(またはキーボードで選ぶ)と、ボタンが左へ伸びて、
   * アイコンの右に名前を出す。右端に置くボタン向け。
   */
  expandLabel?: boolean;
  children: ReactNode;
}

/** ツールバーのアイコンボタン。ポインタを載せると名前とショートカットを出す。 */
export function ToolbarButton({
  label,
  shortcut,
  onClick,
  expandLabel = false,
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
            className={cn(
              "text-mac-label-secondary hover:text-mac-label [&_svg:not([class*='size-'])]:size-[17px]",
              // 縮んでいるときは今までと同じ28px角の丸。広がるときは幅だけが変わる
              expandLabel &&
                "group/expand size-auto h-7 min-w-7 gap-0 px-[5.5px] focus-visible:text-mac-label",
            )}
          />
        }
      >
        {children}
        {expandLabel && (
          // 幅を `0fr` から `1fr` へ動かすと、文字数に合わせた幅へなめらかに伸びる
          <span
            aria-hidden
            className="grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out group-hover/expand:grid-cols-[1fr] group-hover/expand:opacity-100 group-focus-visible/expand:grid-cols-[1fr] group-focus-visible/expand:opacity-100 motion-reduce:transition-none"
          >
            <span className="overflow-hidden">
              <span className="block pr-1.5 pl-1.5 text-mac-body font-medium whitespace-nowrap">
                {label}
              </span>
            </span>
          </span>
        )}
      </TooltipTrigger>
      {(!expandLabel || shortcut) && (
        <TooltipContent
          side="bottom"
          sideOffset={6}
          className="flex items-center gap-2"
        >
          {!expandLabel && label}
          {shortcut && <ShortcutHint id={shortcut} />}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
