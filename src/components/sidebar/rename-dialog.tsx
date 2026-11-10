import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRenameConversation } from "@/hooks/use-history";
import { errorMessage } from "@/services/ipc";
import type { ConversationSummary } from "@/types/bindings";

interface RenameDialogProps {
  /** 名前を変える会話。`null` のあいだは閉じている。 */
  conversation: ConversationSummary | null;
  onClose: () => void;
}

/** 会話の名前を変えるダイアログ。 */
export function RenameDialog({ conversation, onClose }: RenameDialogProps) {
  return (
    <Dialog
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>名前を変更</DialogTitle>
          <DialogDescription>会話の名前を入力してください。</DialogDescription>
        </DialogHeader>
        {conversation && (
          // 会話ごとに、現在の名前から始める
          <RenameForm
            key={conversation.id}
            conversation={conversation}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  conversation,
  onClose,
}: {
  conversation: ConversationSummary;
  onClose: () => void;
}) {
  const inputId = useId();
  const [title, setTitle] = useState(conversation.title);
  const rename = useRenameConversation();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    rename.mutate({ id: conversation.id, title }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={inputId}>名前</FieldLabel>
        <Input
          id={inputId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoComplete="off"
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
        />
      </Field>
      {rename.isError && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(rename.error)}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          type="submit"
          disabled={rename.isPending || title.trim() === ""}
        >
          {rename.isPending && <Spinner />}
          保存
        </Button>
      </DialogFooter>
    </form>
  );
}
