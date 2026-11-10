import type { GenerationSettings } from "@/types/bindings";

/** 入力欄の文字列のまま持っている、生成の設定の下書き。 */
export interface GenerationDraft {
  systemPrompt: string;
  temperature: string;
  maxTokens: string;
}

export const TEMPERATURE_MIN = 0;
export const TEMPERATURE_MAX = 2;

export type ParsedDraft =
  | { ok: true; value: GenerationSettings }
  | { ok: false; message: string };

/** 保存済みの設定から、入力欄に入れる下書きを作る。 */
export function draftOf(settings: GenerationSettings): GenerationDraft {
  return {
    systemPrompt: settings.systemPrompt ?? "",
    temperature:
      settings.temperature == null ? "" : String(settings.temperature),
    maxTokens: settings.maxTokens == null ? "" : String(settings.maxTokens),
  };
}

/** 下書きを設定に直す。空欄は「サーバーの既定」(`null`)。範囲の外や数値でないものは失敗にする。 */
export function parseDraft(draft: GenerationDraft): ParsedDraft {
  const temperatureText = draft.temperature.trim();
  let temperature: number | null = null;
  if (temperatureText !== "") {
    temperature = Number(temperatureText);
    if (
      !Number.isFinite(temperature) ||
      temperature < TEMPERATURE_MIN ||
      temperature > TEMPERATURE_MAX
    ) {
      return {
        ok: false,
        message: `temperatureは${TEMPERATURE_MIN}〜${TEMPERATURE_MAX}の数値で指定してください`,
      };
    }
  }

  const maxTokensText = draft.maxTokens.trim();
  let maxTokens: number | null = null;
  if (maxTokensText !== "") {
    maxTokens = Number(maxTokensText);
    if (!Number.isInteger(maxTokens) || maxTokens < 1) {
      return {
        ok: false,
        message: "最大トークン数は1以上の整数で指定してください",
      };
    }
  }

  return {
    ok: true,
    value: { systemPrompt: draft.systemPrompt, temperature, maxTokens },
  };
}

/** 保存済みの設定と、同じ内容か。省略された項目は「空・既定」として比べる。 */
export function isSameSettings(
  a: GenerationSettings,
  b: GenerationSettings,
): boolean {
  return (
    (a.systemPrompt ?? "") === (b.systemPrompt ?? "") &&
    (a.temperature ?? null) === (b.temperature ?? null) &&
    (a.maxTokens ?? null) === (b.maxTokens ?? null)
  );
}
