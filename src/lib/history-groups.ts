import type { ConversationSummary } from "@/types/bindings";

export type HistoryGroupId = "today" | "yesterday" | "week" | "older";

export interface HistoryGroup {
  id: HistoryGroupId;
  label: string;
  items: ConversationSummary[];
}

const LABELS: Record<HistoryGroupId, string> = {
  today: "今日",
  yesterday: "昨日",
  week: "過去7日間",
  older: "それ以前",
};

/** 表示する順。 */
const ORDER: HistoryGroupId[] = ["today", "yesterday", "week", "older"];

/** `now` を含む日(ローカル時間)の0時から、`daysAgo`日前の0時のミリ秒。夏時間でもずれないよう暦で数える。 */
function startOfDay(now: Date, daysAgo: number): number {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
  ).getTime();
}

/**
 * 履歴を、更新日時で「今日 / 昨日 / 過去7日間 / それ以前」に分ける。
 * 並びは渡された順のまま。空のグループは返さない。時刻は引数で受け取る(UNIX秒の `updatedAt` と比べる)。
 */
export function groupByDate(
  items: readonly ConversationSummary[],
  now: Date,
): HistoryGroup[] {
  const today = startOfDay(now, 0);
  const yesterday = startOfDay(now, 1);
  const week = startOfDay(now, 7);

  const buckets: Record<HistoryGroupId, ConversationSummary[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };
  for (const item of items) {
    const updated = item.updatedAt * 1000;
    // 未来の時刻(時計のずれ)は今日に入れる
    const id: HistoryGroupId =
      updated >= today
        ? "today"
        : updated >= yesterday
          ? "yesterday"
          : updated >= week
            ? "week"
            : "older";
    buckets[id].push(item);
  }

  return ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    label: LABELS[id],
    items: buckets[id],
  }));
}
