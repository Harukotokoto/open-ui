import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";

interface SendButtonProps {
  /** 返答の生成中か。生成中は停止ボタンになる。 */
  busy: boolean;
  /** 送信できる状態か。 */
  canSend: boolean;
  onStop: () => void;
}

/** アクセントカラーの丸いボタン。 */
const ROUND_CLASS = "size-7 rounded-full [&>svg:not([class*='size-'])]:size-4";

/** 入力欄の送信ボタン。返答中は停止ボタンになる。 */
export function SendButton({ busy, canSend, onStop }: SendButtonProps) {
  if (busy) {
    return (
      <InputGroupButton
        variant="default"
        size="icon-sm"
        className={ROUND_CLASS}
        onClick={onStop}
      >
        <SquareIcon className="size-3 fill-current" />
        <span className="sr-only">生成を止める</span>
      </InputGroupButton>
    );
  }
  return (
    <InputGroupButton
      type="submit"
      variant="default"
      size="icon-sm"
      className={ROUND_CLASS}
      disabled={!canSend}
    >
      <ArrowUpIcon strokeWidth={2.5} />
      <span className="sr-only">送信</span>
    </InputGroupButton>
  );
}
