import { PlusIcon } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";

interface AttachButtonProps {
  variant?: "outline" | "ghost";
  /** ファイルを選ぶダイアログを開く。 */
  onClick: () => void;
  /** 添付の上限に達したときなど。 */
  disabled?: boolean;
}

/** ファイルの添付ボタン。OSのファイル選択ダイアログを開く。 */
export function AttachButton({
  variant = "outline",
  onClick,
  disabled = false,
}: AttachButtonProps) {
  return (
    <InputGroupButton
      type="button"
      variant={variant}
      size="icon-sm"
      disabled={disabled}
      onClick={onClick}
      aria-label="ファイルを添付"
    >
      <PlusIcon />
    </InputGroupButton>
  );
}
