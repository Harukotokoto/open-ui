import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import { useAvailableModels, useSaveConnection } from "@/hooks/use-profiles";
import { cn } from "@/lib/utils";
import type { ConnectionProfile } from "@/types/bindings";

/** モデルを選んでいないとき(サーバーの既定を使うとき)の表示。 */
const DEFAULT_LABEL = "モデル";
/** 「サーバーの既定」を表すラジオの値。モデルIDとは衝突しない値にする。 */
const DEFAULT_VALUE = "";

interface ModelSelectorProps {
  profile: ConnectionProfile;
  /** 開くボタンに足すclass(小さくするときなど)。 */
  className?: string;
}

/**
 * 入力欄に置く、モデルの選択メニュー。
 * 候補は接続先から取得し、選ぶと使用中のプロファイルの選択モデルとして保存する。
 */
export function ModelSelector({ profile, className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const models = useAvailableModels(profile, open);
  const save = useSaveConnection();
  const selected = profile.selectedModel ?? DEFAULT_VALUE;

  const choose = (value: string) => {
    save.mutate({
      profile: { ...profile, selectedModel: value === "" ? null : value },
      keyChange: { type: "keep" },
    });
  };

  // 保存済みのモデルが一覧にないときも、選択中として見えるようにする
  const candidates = models.data ?? [];
  const options =
    selected !== DEFAULT_VALUE && !candidates.includes(selected)
      ? [selected, ...candidates]
      : candidates;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <InputGroupButton
            size="sm"
            aria-label="モデルを選ぶ"
            className={cn("max-w-48 text-foreground", className)}
          />
        }
      >
        <span className="truncate">{selected || DEFAULT_LABEL}</span>
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-56">
        <DropdownMenuRadioGroup
          value={selected}
          onValueChange={(value) => choose(String(value))}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{profile.name}</DropdownMenuLabel>
            <DropdownMenuRadioItem value={DEFAULT_VALUE}>
              サーバーの既定
            </DropdownMenuRadioItem>
            {options.map((id) => (
              <DropdownMenuRadioItem key={id} value={id}>
                {id}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuRadioGroup>
        {models.isPending && open ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            モデルを読み込み中...
          </p>
        ) : null}
        {models.isError ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            モデルの一覧を取得できませんでした。
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
