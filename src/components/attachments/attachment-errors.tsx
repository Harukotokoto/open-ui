import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttachmentErrorsProps {
  errors: string[];
  onDismiss: () => void;
}

/** 添付できなかったファイルの理由。閉じるまで残す。 */
export function AttachmentErrors({ errors, onDismiss }: AttachmentErrorsProps) {
  if (errors.length === 0) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 px-3 pt-2 text-xs text-destructive"
    >
      <ul className="min-w-0 flex-1 space-y-0.5">
        {errors.map((message, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 同じ文面が並ぶことがあり、順番が変わらない一覧なので
          <li key={index} className="wrap-break-word">
            {message}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        aria-label="エラーを閉じる"
      >
        <XIcon />
      </Button>
    </div>
  );
}
