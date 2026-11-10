import { CircleCheckIcon } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

interface ReasoningTraceProps {
  text: string;
  /** 思考がいま流れてきているか。 */
  running: boolean;
}

/** モデルの思考。思考中は開いて、終わると閉じる。ユーザーが開閉したら、その状態を保つ。 */
export function ReasoningTrace({ text, running }: ReasoningTraceProps) {
  const [open, setOpen] = useState<boolean>();

  return (
    <TraceCollapsible open={open ?? running} onOpenChange={setOpen}>
      <TraceCollapsibleTrigger>
        <TraceLine status={running ? "running" : undefined}>
          <TraceIcon>{running ? <Spinner /> : <CircleCheckIcon />}</TraceIcon>
          <TraceTitle>{running ? "考え中" : "思考しました"}</TraceTitle>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-wrap">
        {text}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}
