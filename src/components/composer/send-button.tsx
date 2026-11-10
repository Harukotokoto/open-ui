import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";

interface SendButtonProps {
  /** 返答の生成中か。生成中は停止ボタンになる。 */
  busy: boolean;
  /** 送信できる状態か。 */
  canSend: boolean;
  onStop: () => void;
}

/** 入力欄の送信ボタン。返答中は停止ボタンになる。 */
export function SendButton({ busy, canSend, onStop }: SendButtonProps) {
  if (busy) {
    return (
      <InputGroupButton variant="default" size="icon-sm" onClick={onStop}>
        <SquareIcon className="fill-current" />
        <span className="sr-only">生成を止める</span>
      </InputGroupButton>
    );
  }
  return (
    <InputGroupButton
      type="submit"
      variant="default"
      size="icon-sm"
      disabled={!canSend}
    >
      <ArrowUpIcon />
      <span className="sr-only">送信</span>
    </InputGroupButton>
  );
}
