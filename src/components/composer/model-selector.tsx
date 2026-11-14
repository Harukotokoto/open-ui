import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { ModelPicker } from "@/components/composer/model-picker";
import { InputGroupButton } from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useProfileModels, useRefreshModels } from "@/hooks/use-models";
import { useProfiles, useSelectModel } from "@/hooks/use-profiles";
import { selectionLabel } from "@/lib/model-selection";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  /** 開くボタンに足すclass(小さくするときなど)。 */
  className?: string;
}

/**
 * 入力欄に置く、モデルの選択。開くと全プロファイルのモデルがプロファイルごとにまとまって並び、
 * 検索で絞り込める。別のプロファイルのモデルを選ぶと、使用中のプロファイルもそちらに切り替わる。
 * モデル一覧は開いたときに取得し、5分間は取得済みのものを使う。
 */
export function ModelSelector({ className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: book } = useProfiles();
  const queries = useProfileModels(book?.profiles ?? [], open);
  const refresh = useRefreshModels();
  const select = useSelectModel();

  if (!book) return null;

  const handleSelect = (profileId: string, model: string | null) => {
    select.mutate({ profileId, model });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <InputGroupButton
            size="sm"
            aria-label="モデルを選ぶ"
            className={cn(
              "h-7 max-w-48 gap-1 rounded-full px-3 text-mac-body text-mac-label-secondary hover:text-mac-label data-popup-open:bg-mac-fill-secondary data-popup-open:text-mac-label",
              className,
            )}
          />
        }
      >
        <span className="truncate">{selectionLabel(book)}</span>
        <ChevronDownIcon />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] gap-0 p-0"
      >
        <ModelPicker
          book={book}
          models={queries.map((query) => ({
            data: query.data,
            error: query.error,
            isError: query.isError,
            isFetching: query.isFetching,
            refetch: () => void query.refetch(),
          }))}
          onSelect={handleSelect}
          onRefresh={() => void refresh()}
          refreshing={queries.some((query) => query.isFetching)}
        />
      </PopoverContent>
    </Popover>
  );
}
