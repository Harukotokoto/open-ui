/** 思考パーツの`providerMetadata`に、思考にかかった時間を入れるときの名前空間。 */
const NAMESPACE = "openUi";

/** 思考にかかった時間を、思考パーツのメタデータの形にする。 */
export function toReasoningMetadata(durationMs: number) {
  return { [NAMESPACE]: { reasoningMs: durationMs } };
}

/** 思考パーツのメタデータから、思考にかかった時間(ミリ秒)を取り出す。無い・形が合わないときは `undefined`。 */
export function getReasoningMs(metadata: unknown): number | undefined {
  if (typeof metadata !== "object" || metadata === null) return undefined;
  const scope = (metadata as Record<string, unknown>)[NAMESPACE];
  if (typeof scope !== "object" || scope === null) return undefined;
  const ms = (scope as Record<string, unknown>).reasoningMs;
  return typeof ms === "number" && Number.isFinite(ms) && ms >= 0
    ? ms
    : undefined;
}

/** 秒数の表示用に丸める(整数秒)。 */
export function toSeconds(ms: number): number {
  return Math.round(ms / 1000);
}
