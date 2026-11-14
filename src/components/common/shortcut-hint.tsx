import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { platform } from "@/lib/platform";
import { formatShortcut, SHORTCUTS, type ShortcutId } from "@/lib/shortcuts";

/** ショートカットのキーを、キーキャップの並びで出す(`⌘` `N` / `Ctrl` `N`)。 */
export function ShortcutHint({
  id,
  className,
}: {
  id: ShortcutId;
  className?: string;
}) {
  return (
    <KbdGroup className={className} aria-hidden>
      {formatShortcut(SHORTCUTS[id], platform).map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}
