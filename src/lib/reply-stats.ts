import type { UIMessage } from "ai";

/** 1回の返答の出力の統計。メッセージのメタデータ(`message.metadata.stats`)として保存される。 */
export interface ReplyStats {
  /** 出力したトークン数(思考を含む)。 */
  tokens: number;
  /** 最初の出力から最後の出力までの時間(ミリ秒)。 */
  elapsedMs: number;
  /** サーバーがトークン数を返さず、受け取ったチャンクの数で代用したか。 */
  estimated: boolean;
}

function isReplyStats(value: unknown): value is ReplyStats {
  if (typeof value !== "object" || value === null) return false;
  const stats = value as Record<string, unknown>;
  return (
    typeof stats.tokens === "number" &&
    typeof stats.elapsedMs === "number" &&
    typeof stats.estimated === "boolean"
  );
}

/** メッセージに付いた統計。無い・形が合わないときは `undefined`。 */
export function getReplyStats(message: UIMessage): ReplyStats | undefined {
  const metadata = message.metadata;
  if (typeof metadata !== "object" || metadata === null) return undefined;
  const stats = (metadata as Record<string, unknown>).stats;
  return isReplyStats(stats) ? stats : undefined;
}

/** 1秒あたりのトークン数。時間が0以下なら `undefined`。 */
export function tokensPerSecond(stats: ReplyStats): number | undefined {
  if (stats.elapsedMs <= 0 || stats.tokens <= 0) return undefined;
  return stats.tokens / (stats.elapsedMs / 1000);
}

/** 画面に出す文字列。例: `42.3 tokens/s`、トークン数が推定のときは `約 42.3 tokens/s`。 */
export function formatReplyStats(stats: ReplyStats): string | undefined {
  const speed = tokensPerSecond(stats);
  if (speed === undefined) return undefined;
  const text = `${speed.toFixed(speed >= 100 ? 0 : 1)} tokens/s`;
  return stats.estimated ? `約 ${text}` : text;
}
