import {
  AttachmentItem,
  type AttachmentItemData,
} from "@/components/attachments/attachment-item";
import { AttachmentGroup } from "@/components/ui/attachment";
import { cn } from "@/lib/utils";

interface AttachmentRowProps {
  conversationId: string;
  items: AttachmentItemData[];
  /** 指定すると、各件に外すボタンが出る。 */
  onRemove?: (id: string) => void;
  className?: string;
}

/** 添付の並び。入力欄の上と、ユーザーの発言の上で使う。 */
export function AttachmentRow({
  conversationId,
  items,
  onRemove,
  className,
}: AttachmentRowProps) {
  if (items.length === 0) return null;
  return (
    <AttachmentGroup className={cn("gap-2", className)}>
      {items.map((item) => (
        <AttachmentItem
          key={item.id}
          conversationId={conversationId}
          {...item}
          onRemove={onRemove ? () => onRemove(item.id) : undefined}
        />
      ))}
    </AttachmentGroup>
  );
}
