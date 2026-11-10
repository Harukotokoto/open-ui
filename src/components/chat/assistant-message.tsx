import type { UIMessage } from "ai";
import { ReasoningTrace } from "@/components/chat/reasoning-trace";
import { ReplyStatsLine } from "@/components/chat/reply-stats-line";
import { ReplyText } from "@/components/chat/reply-text";
import { Message, MessageContent } from "@/components/ui/message";
import { Trace } from "@/components/ui/trace";
import { getReasoningMs } from "@/lib/reasoning-duration";
import { getReplyStats } from "@/lib/reply-stats";

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
  const stats = getReplyStats(message);
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
                  durationMs={getReasoningMs(part.providerMetadata)}
                />
              </Trace>
            );
          }
          if (part.type === "text") {
            return (
              <ReplyText
                key={key}
                text={part.text}
                // 中断された本文も`streaming`のまま残るので、生成中の返答に限る
                streaming={streaming && part.state === "streaming"}
              />
            );
          }
          return null;
        })}
        {/* 出力が終わってから、下に小さく添える */}
        {!streaming && stats && <ReplyStatsLine stats={stats} />}
      </MessageContent>
    </Message>
  );
}
