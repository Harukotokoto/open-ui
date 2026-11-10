import { MessageFooter } from "@/components/ui/message";
import { formatReplyStats, type ReplyStats } from "@/lib/reply-stats";

interface ReplyStatsLineProps {
  stats: ReplyStats;
}

/** 返答の下に小さく添える、出力速度(tokens/s)。測れていなければ何も出さない。 */
export function ReplyStatsLine({ stats }: ReplyStatsLineProps) {
  const text = formatReplyStats(stats);
  if (text === undefined) return null;
  return (
    <MessageFooter className="px-0">
      <span
        data-slot="reply-stats"
        className="text-xs font-normal tabular-nums text-muted-foreground"
        title={`${stats.tokens} tokens / ${(stats.elapsedMs / 1000).toFixed(1)} 秒${stats.estimated ? "(チャンク数からの推定)" : ""}`}
      >
        {text}
      </span>
    </MessageFooter>
  );
}
