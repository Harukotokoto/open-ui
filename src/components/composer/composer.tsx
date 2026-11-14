import { useRef, useState } from "react";
import { AttachmentErrors } from "@/components/attachments/attachment-errors";
import { AttachmentRow } from "@/components/attachments/attachment-row";
import { AttachButton } from "@/components/composer/attach-button";
import { SendButton } from "@/components/composer/send-button";
import { VoiceButton } from "@/components/composer/voice-button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { useAttachments } from "@/hooks/use-attachments";
import { useFileDrop } from "@/hooks/use-file-drop";
import { useUiSettings } from "@/hooks/use-ui-settings";
import { isJustComposed, shouldSendOnEnter } from "@/lib/composer-keys";
import { cn } from "@/lib/utils";
import type { AttachmentInfo } from "@/types/bindings";

interface ComposerProps {
  /** 添付の置き場になる会話のID。 */
  conversationId: string;
  /** 送信する。本文が空白だけで添付も無いときは呼ばれない。 */
  onSend: (text: string, attachments: AttachmentInfo[]) => void;
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
 * 入力欄の殻。会話の上に浮かぶガラスのカプセル。
 * 入力中は常にカーソルがあるので、フォーカスリングは出さない。
 */
const SHELL_CLASS =
  "rounded-(--composer-radius) mac-glass backdrop-blur-xl backdrop-saturate-150 transition-[outline-color] outline-2 outline-offset-2 outline-transparent";

/** 殻の中の入力欄。枠と背景は殻に任せる。 */
const GROUP_CLASS =
  "h-auto rounded-(--composer-radius) bg-transparent shadow-none has-[[data-slot=input-group-control]:focus-visible]:shadow-none";

const TEXTAREA_CLASS =
  "min-h-0 bg-transparent font-normal text-(length:--chat-font-size) leading-(--chat-line-height) placeholder:text-mac-label-secondary";

/** メッセージの入力欄。Enterで送信、Shift+Enterで改行(設定で逆にできる)。返答中は送信ボタンが停止ボタンになる。 */
export function Composer({
  conversationId,
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
  /** 直近の変換の終了時刻(`compositionend` の `timeStamp`) */
  const compositionEndedAt = useRef<number | null>(null);
  const shiftEnter = useUiSettings().data?.shiftEnter ?? "newline";
  const attachments = useAttachments(conversationId);
  // 返答の生成中は、次の発言を送れないので、添付も受け付けない
  const { dragging, handlers: dropHandlers } = useFileDrop(
    (files) => void attachments.addFiles(files),
    busy,
  );
  const hasContent = text.trim() !== "" || attachments.items.length > 0;
  // 添付の保存が終わるまで送らない(送る一覧に入らないため)
  const canSend = hasContent && !busy && !sendDisabled && !attachments.busy;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    onSend(text.trim(), attachments.takeAll());
    attachments.clearErrors();
    setText("");
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    void attachments.addFiles(files);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 変換を確定するEnterでは送信しない(macOSでは isComposing が偽になるため、判定を分けてある)
    const send = shouldSendOnEnter(
      {
        key: event.key,
        shiftKey: event.shiftKey,
        isComposing: event.nativeEvent.isComposing,
        keyCode: event.keyCode,
        justComposed: isJustComposed(
          compositionEndedAt.current,
          event.timeStamp,
        ),
      },
      shiftEnter,
    );
    if (!send) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  const textarea = (className: string) => (
    <InputGroupTextarea
      value={text}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onCompositionEnd={(event) => {
        compositionEndedAt.current = event.timeStamp;
      }}
      placeholder={placeholder}
      aria-label="メッセージ"
      rows={1}
      autoFocus={autoFocus}
      className={cn(TEXTAREA_CLASS, className)}
    />
  );
  const send = <SendButton busy={busy} canSend={canSend} onStop={onStop} />;
  const attach = (
    <AttachButton
      onClick={() => void attachments.pick()}
      disabled={busy || attachments.full}
    />
  );
  // ファイルを重ねているあいだは、落とせる場所だと分かるようにアクセントの点線で囲む
  const shellClass = cn(
    SHELL_CLASS,
    dragging && "outline-dashed outline-mac-accent",
  );
  const preview = (
    <>
      <AttachmentRow
        conversationId={conversationId}
        items={attachments.items}
        onRemove={attachments.remove}
        className="px-1 pb-1.5"
      />
      <AttachmentErrors
        errors={attachments.errors}
        onDismiss={attachments.clearErrors}
      />
    </>
  );

  if (variant === "compact") {
    return (
      <form
        ref={formRef}
        onSubmit={submit}
        className="w-full"
        {...dropHandlers}
      >
        {preview}
        <div className={shellClass}>
          <InputGroup className={GROUP_CLASS}>
            <InputGroupAddon
              align="inline-start"
              className="self-end pb-2 pl-2"
            >
              {attach}
            </InputGroupAddon>
            {textarea("max-h-40 px-1 py-3")}
            <InputGroupAddon align="inline-end" className="self-end pr-2 pb-2">
              <VoiceButton />
              {send}
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex min-h-7 items-center justify-between gap-2 px-3 pt-1.5">
          <p className="min-w-0 truncate text-mac-subheadline text-mac-label-secondary">
            {hint}
          </p>
          {actions}
        </div>
      </form>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} className="w-full" {...dropHandlers}>
      {preview}
      <div className={shellClass}>
        <InputGroup className={GROUP_CLASS}>
          {textarea("max-h-60 min-h-20 px-4 pt-3.5 pb-1")}
          <InputGroupAddon align="block-end" className="gap-1 px-2 pb-2">
            {attach}
            <div className="ml-auto flex items-center gap-1">
              {actions}
              <VoiceButton />
              {send}
            </div>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </form>
  );
}
