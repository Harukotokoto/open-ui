import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { profilePresetOptions } from "@/lib/profile-presets";
import type { ProfilePreset } from "@/types/bindings";

interface AddProfileMenuProps {
  onAdd: (preset: ProfilePreset) => void;
  /** 追加している最中か */
  pending?: boolean;
}

/** プロファイルの追加ボタン。押すと、雛形(LM Studio・Ollama など)を選ぶメニューが開く。 */
export function AddProfileMenu({
  onAdd,
  pending = false,
}: AddProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="sm" />}
        disabled={pending}
      >
        {pending ? <Spinner /> : <PlusIcon />}
        接続先を追加
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>種類を選ぶ</DropdownMenuLabel>
          {profilePresetOptions.map((option) => (
            <DropdownMenuItem key={option.id} onClick={() => onAdd(option.id)}>
              {option.label}
              <span className="ml-auto text-xs text-muted-foreground">
                {option.hint}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
