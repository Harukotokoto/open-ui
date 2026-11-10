import { CircleCheckIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { toSeconds } from "@/lib/reasoning-duration";

interface ReasoningTraceProps {
  text: string;
  /** 思考がいま流れてきているか。 */
  running: boolean;
  /** 思考にかかった時間(ミリ秒)。終わっていて、記録があるときだけ渡る。 */
  durationMs?: number;
}

/** モデルの思考。初めは閉じていて、ユーザーが開くと中身を読める。 */
export function ReasoningTrace({
  text,
  running,
  durationMs,
}: ReasoningTraceProps) {
  const elapsedSeconds = useElapsedSeconds(running);

  const title = running
    ? `思考中... (${elapsedSeconds}秒)`
    : durationMs === undefined
      ? "思考しました"
      : `${Math.max(1, toSeconds(durationMs))}秒思考しました`;

  return (
    <TraceCollapsible>
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>{running ? <Spinner /> : <CircleCheckIcon />}</TraceIcon>
          <TraceTitle>{title}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">
        {text}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}
