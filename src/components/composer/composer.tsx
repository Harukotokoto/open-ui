import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

interface ComposerProps {
  /** 送信する。空白だけのときは呼ばれない。 */
  onSend: (text: string) => void;
  /** 返答の生成を止める。 */
  onStop: () => void;
  /** 返答の生成中か。 */
  busy: boolean;
  /** 送信できない状態か(接続先を読み込み中など)。入力はできる。 */
  sendDisabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

/** メッセージの入力欄。Enterで送信、Shift+Enterで改行。返答中は送信ボタンが停止ボタンになる。 */
export function Composer({
  onSend,
  onStop,
  busy,
  sendDisabled = false,
  placeholder = "メッセージを入力",
  autoFocus = false,
}: ComposerProps) {
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const canSend = text.trim() !== "" && !busy && !sendDisabled;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 日本語入力の変換を確定するEnterでは、送信しない
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} onSubmit={submit} className="w-full">
      {/* 枠は目立たせず、フォーカス時は枠の色だけを少し変える(太いリングは出さない) */}
      <InputGroup className="rounded-3xl border-border bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-ring/60 focus-within:shadow-md has-[[data-slot=input-group-control]:focus-visible]:border-ring/60 has-[[data-slot=input-group-control]:focus-visible]:ring-0">
        <InputGroupTextarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="メッセージ"
          rows={1}
          autoFocus={autoFocus}
          className="max-h-60 min-h-10 px-4 pt-4 pb-1 text-base leading-6 md:text-base"
        />
        <InputGroupAddon align="block-end" className="px-3 pt-0 pb-3">
          {busy ? (
            <InputGroupButton
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full"
              onClick={onStop}
            >
              <SquareIcon className="fill-current" />
              <span className="sr-only">生成を止める</span>
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="ml-auto rounded-full"
              disabled={!canSend}
            >
              <ArrowUpIcon />
              <span className="sr-only">送信</span>
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
