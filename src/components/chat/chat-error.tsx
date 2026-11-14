import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ChatErrorProps {
  error: Error;
  onRetry: () => void;
  onOpenSettings: () => void;
}

/** 返答の生成に失敗したときの表示。やり直しと、接続設定を開く操作を添える。 */
export function ChatError({ error, onRetry, onOpenSettings }: ChatErrorProps) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon aria-hidden />
      <AlertTitle>返答を取得できませんでした</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            もう一度試す
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
          >
            接続設定を開く
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
