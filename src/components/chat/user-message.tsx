import type { UIMessage } from "ai";
import { AttachmentRow } from "@/components/attachments/attachment-row";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { attachmentIdOf, getAttachmentParts } from "@/lib/attachments";
import { getMessageText } from "@/lib/messages";

interface UserMessageProps {
  /** 添付の置き場になる会話のID。 */
  conversationId: string;
  message: UIMessage;
}

/** ユーザーの発言。アクセントカラーを薄く敷いたバブルで右に寄せる。添付があれば、バブルの上に並べる。 */
export function UserMessage({ conversationId, message }: UserMessageProps) {
  const text = getMessageText(message);
  const attachments = getAttachmentParts(message).flatMap((part) => {
    const id = attachmentIdOf(part);
    return id === undefined
      ? []
      : [{ id, filename: part.filename ?? "file", mediaType: part.mediaType }];
  });
  return (
    <Message align="end">
      <MessageContent>
        <AttachmentRow
          conversationId={conversationId}
          items={attachments}
          className="justify-end"
        />
        {text !== "" && (
          <Bubble align="end" variant="tinted">
            <BubbleContent className="px-3.5 py-2 text-(length:--chat-font-size) leading-(--chat-line-height) whitespace-pre-wrap">
              {text}
            </BubbleContent>
          </Bubble>
        )}
      </MessageContent>
    </Message>
  );
}
