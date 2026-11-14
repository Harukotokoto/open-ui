import { useEffect, useId, useRef, useState } from "react";
import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useGenerationSettings,
  useSaveGenerationSettings,
} from "@/hooks/use-generation-settings";
import {
  draftOf,
  type GenerationDraft,
  isSameSettings,
  parseDraft,
  TEMPERATURE_MAX,
  TEMPERATURE_MIN,
} from "@/lib/generation-draft";
import { errorMessage } from "@/services/ipc";
import type { GenerationSettings } from "@/types/bindings";

/** 入力が止まってから保存するまでの待ち時間(ms)。 */
const AUTOSAVE_DELAY = 700;

/** 「生成」。システムプロンプト・temperature・最大トークン数。全プロファイル共通で、即時に反映する。 */
export function GenerationPanel() {
  const { data, isPending, isError, error } = useGenerationSettings();

  if (data) return <GenerationForm saved={data} />;
  if (isPending) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }
  return (
    isError && (
      <Alert variant="destructive">
        <AlertDescription>{errorMessage(error)}</AlertDescription>
      </Alert>
    )
  );
}

function GenerationForm({ saved }: { saved: GenerationSettings }) {
  const ids = { prompt: useId(), temperature: useId(), maxTokens: useId() };
  const [draft, setDraft] = useState<GenerationDraft>(() => draftOf(saved));
  const [invalid, setInvalid] = useState<string | null>(null);
  const save = useSaveGenerationSettings();

  // タイマーや blur から、最新の値を読めるようにする
  const latest = useRef({ draft, saved, save: save.mutate });
  latest.current = { draft, saved, save: save.mutate };

  const commit = () => {
    const current = latest.current;
    const parsed = parseDraft(current.draft);
    if (!parsed.ok) {
      setInvalid(parsed.message);
      return;
    }
    setInvalid(null);
    if (!isSameSettings(parsed.value, current.saved)) {
      current.save(parsed.value);
    }
  };

  // 入力が止まったら保存する(`commit` は ref 経由で最新の値を読むので、依存は下書きだけ)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 下書きが変わったときだけ予約し直す
  useEffect(() => {
    const timer = setTimeout(commit, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [draft]);

  const change = (patch: Partial<GenerationDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const problem = invalid ?? (save.isError ? errorMessage(save.error) : null);

  return (
    <>
      <SettingSection title="すべての会話">
        <SettingRow
          label="システムプロンプト"
          htmlFor={ids.prompt}
          description="すべての会話の先頭に付けます。空欄なら付けません。"
          stacked
        >
          <Textarea
            id={ids.prompt}
            rows={4}
            className="max-h-60 min-h-24"
            value={draft.systemPrompt}
            onChange={(event) => change({ systemPrompt: event.target.value })}
            onBlur={commit}
          />
        </SettingRow>

        <SettingRow
          label="temperature"
          htmlFor={ids.temperature}
          description={`${TEMPERATURE_MIN}〜${TEMPERATURE_MAX}。空欄ならサーバーの既定です。`}
        >
          <Input
            id={ids.temperature}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={TEMPERATURE_MIN}
            max={TEMPERATURE_MAX}
            placeholder="既定"
            className="w-28"
            value={draft.temperature}
            onChange={(event) => change({ temperature: event.target.value })}
            onBlur={commit}
          />
        </SettingRow>

        <SettingRow
          label="最大トークン数"
          htmlFor={ids.maxTokens}
          description="返答の長さの上限。空欄ならサーバーの既定です。"
        >
          <Input
            id={ids.maxTokens}
            type="number"
            inputMode="numeric"
            step="1"
            min={1}
            placeholder="既定"
            className="w-28"
            value={draft.maxTokens}
            onChange={(event) => change({ maxTokens: event.target.value })}
            onBlur={commit}
          />
        </SettingRow>
      </SettingSection>

      <div className="min-h-9 pt-3" aria-live="polite">
        {problem ? (
          <Alert variant="destructive">
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        ) : (
          save.isPending && <Spinner />
        )}
      </div>
    </>
  );
}
