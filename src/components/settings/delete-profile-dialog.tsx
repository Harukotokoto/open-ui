import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRemoveProfile } from "@/hooks/use-profiles";
import { errorMessage } from "@/services/ipc";
import type { ConnectionProfile } from "@/types/bindings";

interface DeleteProfileDialogProps {
  /** 削除する接続先。`null` のあいだは閉じている。 */
  profile: ConnectionProfile | null;
  onClose: () => void;
  /** 削除できたあとに呼ぶ。 */
  onDeleted: (id: string) => void;
}

/** 接続先を削除する前の確認。保存したAPIキーも一緒に消え、元に戻せない。 */
export function DeleteProfileDialog({
  profile,
  onClose,
  onDeleted,
}: DeleteProfileDialogProps) {
  const remove = useRemoveProfile();

  const close = () => {
    remove.reset();
    onClose();
  };

  const handleDelete = () => {
    if (!profile) return;
    remove.mutate(profile.id, {
      onSuccess: () => {
        onDeleted(profile.id);
        close();
      },
    });
  };

  return (
    <AlertDialog
      open={profile !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この接続先を削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            「{profile?.name}
            」を削除します。保存したAPIキーも消え、元に戻せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {remove.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(remove.error)}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={handleDelete}
          >
            {remove.isPending && <Spinner />}
            削除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
