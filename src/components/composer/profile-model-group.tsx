import { Button } from "@/components/ui/button";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";
import { isModelSelected, modelOptions } from "@/lib/model-selection";
import { errorMessage } from "@/services/ipc";
import type { ConnectionProfile, ProfileBook } from "@/types/bindings";

/** 「サーバーの既定」の項目に付ける、検索に使う語。 */
const DEFAULT_KEYWORDS = ["サーバーの既定", "既定", "default"];

/** 取得状況のうち、この部品が使うぶんだけ(`useQueries` の結果の一部)。 */
export interface ModelsState {
  data: string[] | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  /** このプロファイルのモデル一覧を取り直す */
  refetch: () => void;
}

interface ProfileModelGroupProps {
  profile: ConnectionProfile;
  book: ProfileBook;
  models: ModelsState;
  /** `model` が `null` なら「サーバーの既定」 */
  onSelect: (profileId: string, model: string | null) => void;
}

/**
 * モデル選択の、1つのプロファイルぶんのまとまり。見出しがプロファイル名で、中にモデルが並ぶ。
 * 一覧を取得できなかったときは、このまとまりの中にだけ理由と再試行を出し、他のまとまりには影響しない。
 */
export function ProfileModelGroup({
  profile,
  book,
  models,
  onSelect,
}: ProfileModelGroupProps) {
  const options = modelOptions(profile, models.data);
  const value = (model: string) => `${profile.id}:${model}`;

  return (
    <CommandGroup
      heading={
        <span className="flex items-center gap-2">
          {profile.name}
          {models.isFetching && <Spinner className="size-3" />}
        </span>
      }
    >
      <CommandItem
        value={`${profile.id}:`}
        keywords={[profile.name, ...DEFAULT_KEYWORDS]}
        data-checked={isModelSelected(book, profile.id, null)}
        onSelect={() => onSelect(profile.id, null)}
      >
        サーバーの既定
      </CommandItem>
      {options.map((model) => (
        <CommandItem
          key={model}
          value={value(model)}
          keywords={[model, profile.name]}
          data-checked={isModelSelected(book, profile.id, model)}
          onSelect={() => onSelect(profile.id, model)}
        >
          <span className="truncate">{model}</span>
        </CommandItem>
      ))}
      {models.isError && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-2 px-2 py-1.5 text-xs text-muted-foreground"
        >
          <span>モデルの一覧を取得できませんでした。</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            disabled={models.isFetching}
            onClick={() => models.refetch()}
          >
            再試行
          </Button>
          <span className="w-full break-words">
            {errorMessage(models.error)}
          </span>
        </div>
      )}
    </CommandGroup>
  );
}
