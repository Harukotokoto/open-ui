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
import { useDeleteConversation } from "@/hooks/use-history";
import { errorMessage } from "@/services/ipc";
import type { ConversationSummary } from "@/types/bindings";

interface DeleteDialogProps {
  /** 削除する会話。`null` のあいだは閉じている。 */
  conversation: ConversationSummary | null;
  onClose: () => void;
  /** 削除できたあとに呼ぶ(開いている会話なら、新しい会話に移るため)。 */
  onDeleted: (id: string) => void;
}

/** 会話を削除する前の確認。削除は元に戻せない。 */
export function DeleteDialog({
  conversation,
  onClose,
  onDeleted,
}: DeleteDialogProps) {
  const remove = useDeleteConversation();

  const close = () => {
    remove.reset();
    onClose();
  };

  const handleDelete = () => {
    if (!conversation) return;
    remove.mutate(conversation.id, {
      onSuccess: () => {
        onDeleted(conversation.id);
        close();
      },
    });
  };

  return (
    <AlertDialog
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この会話を削除しますか?</AlertDialogTitle>
          <AlertDialogDescription>
            「{conversation?.title}」を削除します。元に戻せません。
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
