import { useRef, useState } from "react";
import { AttachButton } from "@/components/composer/attach-button";
import { SendButton } from "@/components/composer/send-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

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
  /**
   * 並べ方。`default` は大きな入力欄(最初の画面)、`compact` は1行のスリムな入力欄(会話の途中)。
   */
  variant?: "default" | "compact";
  /** 送信ボタンの近くに並べる操作(モデルの選択など)。 */
  actions?: React.ReactNode;
  /** `compact` のとき、入力欄の下の左に出す注意書き。 */
  hint?: React.ReactNode;
}

/**
 * フォーカス時も枠線を変えない(カーソルの点滅で入力中だと分かる)。
 * 送信ボタンが無効(空のとき)でも、入力欄全体を薄く(半透明に)しない。
 */
const GROUP_CLASS =
  "has-[[data-slot=input-group-control]:focus-visible]:border-input has-[[data-slot=input-group-control]:focus-visible]:ring-0 has-disabled:bg-transparent has-disabled:opacity-100 dark:has-disabled:bg-input/30";

/** メッセージの入力欄。Enterで送信、Shift+Enterで改行。返答中は送信ボタンが停止ボタンになる。 */
export function Composer({
  onSend,
  onStop,
  busy,
  sendDisabled = false,
  placeholder = "メッセージを入力",
  autoFocus = false,
  variant = "default",
  actions,
  hint,
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

  const textarea = (className: string) => (
    <InputGroupTextarea
      value={text}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      aria-label="メッセージ"
      rows={1}
      autoFocus={autoFocus}
      className={cn("placeholder:text-foreground/70", className)}
    />
  );
  const send = <SendButton busy={busy} canSend={canSend} onStop={onStop} />;

  if (variant === "compact") {
    return (
      <form ref={formRef} onSubmit={submit} className="w-full">
        <InputGroup className={GROUP_CLASS}>
          <InputGroupAddon align="inline-start" className="self-end">
            <AttachButton variant="ghost" />
          </InputGroupAddon>
          {textarea("max-h-40 min-h-0 px-1 py-2.5 text-[14px] md:text-[14px]")}
          <InputGroupAddon align="inline-end" className="self-end">
            {send}
          </InputGroupAddon>
        </InputGroup>
        <div className="flex min-h-7 items-center justify-between gap-2 px-2 pt-1">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {hint}
          </p>
          {actions}
        </div>
      </form>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} className="w-full">
      <InputGroup className={GROUP_CLASS}>
        {textarea("max-h-60 p-3 text-[14px] md:text-[14px]")}
        <InputGroupAddon align="block-end">
          <AttachButton />
          <div className="ml-auto flex items-center gap-1">
            {actions}
            {send}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
