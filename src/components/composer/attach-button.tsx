import { PlusIcon } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";

/** ファイルの添付ボタン。添付は未実装なので、機能を入れるまで押せない状態にしておく。 */
export function AttachButton({
  variant = "outline",
}: {
  variant?: "outline" | "ghost";
}) {
  return (
    <InputGroupButton
      type="button"
      variant={variant}
      size="icon-sm"
      disabled
      aria-label="ファイルを添付(準備中)"
    >
      <PlusIcon />
    </InputGroupButton>
  );
}
