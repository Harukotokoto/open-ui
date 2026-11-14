import { SettingRow } from "@/components/settings/setting-row";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useUpdateCheck } from "@/hooks/use-update-check";
import { errorMessage } from "@/services/ipc";

/** いまの状態を表す説明文。 */
function statusText(app: ReturnType<typeof useUpdateCheck>): string {
  if (app.checking) return "確認しています…";
  if (app.checkError) {
    return `確認できませんでした: ${errorMessage(app.checkError)}`;
  }
  if (app.update) {
    return `v${app.update.version}に更新できます。更新するとアプリが再起動します。`;
  }
  if (app.checked) return "最新のバージョンです。";
  return "新しいバージョンがあるか確認します。起動時にも1回確認しています。";
}

/**
 * 設定の「更新」の1行。「今すぐ確認」で新しいバージョンを探し、
 * 見つかったら同じ場所で「更新して再起動」に変わる。
 */
export function UpdateRow() {
  const app = useUpdateCheck();

  return (
    <>
      <SettingRow label="アップデート" description={statusText(app)}>
        {app.update ? (
          <Button type="button" disabled={app.installing} onClick={app.install}>
            {app.installing && <Spinner />}
            {app.installError ? "もう一度試す" : "更新して再起動"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={app.checking}
            onClick={app.check}
          >
            {app.checking && <Spinner />}
            今すぐ確認
          </Button>
        )}
      </SettingRow>
      {app.installing && (
        <Progress value={app.percent} className="py-3">
          <ProgressLabel>ダウンロード中</ProgressLabel>
          <ProgressValue />
        </Progress>
      )}
      {app.installError && (
        <Alert variant="destructive" className="my-3">
          <AlertDescription>
            更新できませんでした: {errorMessage(app.installError)}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
