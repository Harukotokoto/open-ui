import { MicIcon } from "lucide-react";
import { InputGroupButton } from "@/components/ui/input-group";

/** 音声入力のボタン。録音・文字起こしは未実装なので、機能を入れるまで押せない状態にしておく。 */
export function VoiceButton() {
  return (
    <InputGroupButton
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled
      aria-label="音声入力(準備中)"
    >
      <MicIcon />
    </InputGroupButton>
  );
}
