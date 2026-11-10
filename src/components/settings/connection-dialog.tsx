import { ConnectionForm } from "@/components/settings/connection-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProfile, useKeyStatus } from "@/hooks/use-profiles";

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 接続先の設定ダイアログ。①は使用中の1件だけを編集する。 */
export function ConnectionDialog({
  open,
  onOpenChange,
}: ConnectionDialogProps) {
  const { profile } = useActiveProfile();
  const { data: keyStatus } = useKeyStatus(profile?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>接続設定</DialogTitle>
          <DialogDescription>
            使用するOpenAI互換サーバーを設定します。
          </DialogDescription>
        </DialogHeader>
        {profile ? (
          // ダイアログを開くたびに、保存済みの内容から始める
          <ConnectionForm
            profile={profile}
            keyStatus={keyStatus}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
