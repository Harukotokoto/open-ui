import type { UIMessage } from "ai";
import { ReasoningTrace } from "@/components/chat/reasoning-trace";
import { Message, MessageContent } from "@/components/ui/message";
import { Trace } from "@/components/ui/trace";

interface AssistantMessageProps {
  message: UIMessage;
  /** この返答がいま生成されている最中か。 */
  streaming: boolean;
}

/** AIの返答。バブルは付けず、地の文として表示する。思考は返答の上に並べる。 */
export function AssistantMessage({
  message,
  streaming,
}: AssistantMessageProps) {
  return (
    <Message>
      <MessageContent className="gap-3 text-base leading-7">
        {message.parts.map((part, index) => {
          // パーツは追記されるだけで並べ替わらないため、位置をkeyにしてよい
          const key = `${message.id}-${index}`;
          if (part.type === "reasoning") {
            return (
              <Trace key={key}>
                <ReasoningTrace
                  text={part.text}
                  // 中断された思考は`streaming`のまま残るので、生成中の返答に限る
                  running={streaming && part.state === "streaming"}
                />
              </Trace>
            );
          }
          if (part.type === "text") {
            return (
              <p key={key} className="whitespace-pre-wrap">
                {part.text}
              </p>
            );
          }
          return null;
        })}
      </MessageContent>
    </Message>
  );
}
