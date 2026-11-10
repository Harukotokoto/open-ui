import { ArrowUpIcon, PlusIcon, SquareIcon } from "lucide-react";
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
  /** 送信ボタンの左に並べる操作(モデルの選択など)。 */
  actions?: React.ReactNode;
}

/** メッセージの入力欄。Enterで送信、Shift+Enterで改行。返答中は送信ボタンが停止ボタンになる。 */
export function Composer({
  onSend,
  onStop,
  busy,
  sendDisabled = false,
  placeholder = "メッセージを入力",
  autoFocus = false,
  actions,
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
      <InputGroup>
        <InputGroupTextarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="メッセージ"
          rows={1}
          autoFocus={autoFocus}
          className="max-h-60 p-3 text-[14px] md:text-[14px]"
        />
        <InputGroupAddon align="block-end">
          {/* 添付は未実装。機能を入れるまで押せない状態にしておく */}
          <InputGroupButton
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            disabled
            aria-label="ファイルを添付(準備中)"
          >
            <PlusIcon />
          </InputGroupButton>
          <div className="ml-auto flex items-center gap-1">
            {actions}
            {busy ? (
              <InputGroupButton
                variant="default"
                size="icon-sm"
                className="rounded-full"
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
                className="rounded-full"
                disabled={!canSend}
              >
                <ArrowUpIcon />
                <span className="sr-only">送信</span>
              </InputGroupButton>
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
