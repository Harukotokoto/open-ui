import type { UIMessage } from "ai";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Message, MessageContent } from "@/components/ui/message";
import { getMessageText } from "@/lib/messages";

/** ユーザーの発言。mutedのバブルで右に寄せる。 */
export function UserMessage({ message }: { message: UIMessage }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end" variant="muted">
          <BubbleContent className="rounded-lg text-base whitespace-pre-wrap">
            {getMessageText(message)}
          </BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  );
}
