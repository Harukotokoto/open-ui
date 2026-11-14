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
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { useAppUpdate } from "@/hooks/use-app-update";
import { errorMessage } from "@/services/ipc";

/**
 * 新しいバージョンがあるときに出す確認。
 * 「更新して再起動」でダウンロード・インストールし、終わったら再起動する。
 * ダウンロード中は閉じられない(途中で閉じると、何が起きているか分からなくなるため)。
 */
export function UpdateDialog({ enabled }: { enabled: boolean }) {
  const app = useAppUpdate({ enabled });
  const open = app.update !== null && !app.dismissed;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !app.installing) app.dismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>新しいバージョンがあります</AlertDialogTitle>
          <AlertDialogDescription>
            {app.update &&
              `v${app.update.currentVersion}からv${app.update.version}に更新できます。更新するとアプリが再起動します。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {app.installing && (
          <Progress value={app.percent}>
            <ProgressLabel>ダウンロード中</ProgressLabel>
            <ProgressValue />
          </Progress>
        )}
        {app.installError && (
          <Alert variant="destructive">
            <AlertDescription>
              更新できませんでした: {errorMessage(app.installError)}
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={app.installing}>
            あとで
          </AlertDialogCancel>
          <Button type="button" disabled={app.installing} onClick={app.install}>
            {app.installing && <Spinner />}
            {app.installError ? "もう一度試す" : "更新して再起動"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
