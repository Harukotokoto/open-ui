import { Trash2Icon } from "lucide-react";
import { ConnectionForm } from "@/components/settings/connection-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useKeyStatus } from "@/hooks/use-profiles";
import type { ConnectionProfile } from "@/types/bindings";

interface ProfileCardProps {
  profile: ConnectionProfile;
  /** 使用中か */
  active: boolean;
  /** 編集フォームを開いているか */
  editing: boolean;
  /** 最後の1件か(削除できない) */
  onlyOne: boolean;
  /** 「使用する」を押したあとの処理を待っているか */
  activating?: boolean;
  onActivate: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
}

/**
 * 接続先1件のカード。名前・URL・使用中の印を出し、使用する・編集・削除の操作を持つ。
 * 編集を開くと、カードの中に接続フォーム(接続テスト・保存)が広がる。
 */
export function ProfileCard({
  profile,
  active,
  editing,
  onlyOne,
  activating = false,
  onActivate,
  onToggleEdit,
  onDelete,
}: ProfileCardProps) {
  // 編集を開いているときだけ、キーの状態を問い合わせる
  const { data: keyStatus } = useKeyStatus(editing ? profile.id : undefined);

  return (
    <Card size="sm" role="group" aria-label={profile.name}>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <span className="truncate">{profile.name}</span>
          {active && <Badge variant="secondary">使用中</Badge>}
        </CardTitle>
        <CardDescription className="truncate" title={profile.baseUrl}>
          {profile.baseUrl}
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          {!active && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={activating}
              onClick={onActivate}
            >
              {activating && <Spinner />}
              使用する
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={editing}
            onClick={onToggleEdit}
          >
            {editing ? "閉じる" : "編集"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`「${profile.name}」を削除`}
            title={onlyOne ? "最後の接続先は削除できません" : "削除"}
            disabled={onlyOne}
            onClick={onDelete}
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      {editing && (
        <CardContent>
          <ConnectionForm
            key={profile.id}
            profile={profile}
            keyStatus={keyStatus}
            onCancel={onToggleEdit}
            cancelLabel="閉じる"
          />
        </CardContent>
      )}
    </Card>
  );
}
