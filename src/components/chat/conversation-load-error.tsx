import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/services/ipc";

interface ConversationLoadErrorProps {
  error: unknown;
  onStartNew: () => void;
}

/** 保存済みの会話を読めなかったときの表示。ファイルには手を付けていないので、新しい会話に移れるようにする。 */
export function ConversationLoadError({
  error,
  onStartNew,
}: ConversationLoadErrorProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Alert variant="destructive">
        <AlertTitle>会話を開けませんでした</AlertTitle>
        <AlertDescription>
          <p>{errorMessage(error)}</p>
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStartNew}
            >
              新しい会話を始める
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
