import { PlusIcon } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";

interface AttachButtonProps {
  /** ファイルを選ぶダイアログを開く。 */
  onClick: () => void;
  /** 添付の上限に達したときなど。 */
  disabled?: boolean;
}

/** ファイルの添付ボタン。OSのファイル選択ダイアログを開く。 */
export function AttachButton({ onClick, disabled = false }: AttachButtonProps) {
  return (
    <InputGroupButton
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={disabled}
      onClick={onClick}
      aria-label="ファイルを添付"
      className="size-7 rounded-full text-mac-label-secondary hover:text-mac-label [&>svg:not([class*='size-'])]:size-4"
    >
      <PlusIcon />
    </InputGroupButton>
  );
}
