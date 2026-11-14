import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import {
  type ModelsState,
  ProfileModelGroup,
} from "@/components/composer/profile-model-group";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import { activeModel, matchesModelQuery } from "@/lib/model-selection";
import type { ProfileBook } from "@/types/bindings";

interface ModelPickerProps {
  book: ProfileBook;
  /** `book.profiles` と同じ並びの、モデル一覧の取得状況 */
  models: readonly ModelsState[];
  onSelect: (profileId: string, model: string | null) => void;
  /** 取得済みの一覧を捨てて取り直す */
  onRefresh: () => void;
  /** どれかのプロファイルを取得中か */
  refreshing: boolean;
}

/** 検索つきのモデルの一覧。プロファイルごとにまとまり、入力で全プロファイルのモデルを絞り込める。 */
export function ModelPicker({
  book,
  models,
  onSelect,
  onRefresh,
  refreshing,
}: ModelPickerProps) {
  // 開いたときの強調は、先頭ではなく、いま選んでいる項目から始める。
  // 先頭が青く塗られていると、チェックの付いた選択中の項目と取り違えるため
  const [highlighted, setHighlighted] = useState(
    `${book.activeId}:${activeModel(book) ?? ""}`,
  );

  return (
    <Command
      loop
      value={highlighted}
      onValueChange={setHighlighted}
      filter={matchesModelQuery}
      className="rounded-lg! p-0"
    >
      <CommandInput placeholder="モデルを検索" aria-label="モデルを検索" />
      <CommandList className="max-h-72 p-1">
        <CommandEmpty>見つかりませんでした</CommandEmpty>
        {book.profiles.map((profile, index) => {
          const state = models[index];
          return state ? (
            <ProfileModelGroup
              key={profile.id}
              profile={profile}
              book={book}
              models={state}
              onSelect={onSelect}
            />
          ) : null;
        })}
      </CommandList>
      <div className="flex justify-end border-t p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCwIcon />
          一覧を更新
        </Button>
      </div>
    </Command>
  );
}
