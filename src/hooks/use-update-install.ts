import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  applyDownloadEvent,
  type DownloadProgress,
  downloadPercent,
  initialDownloadProgress,
} from "@/lib/update-progress";
import { installUpdate, type Update } from "@/services/updater";

/**
 * 見つかった更新をダウンロードしてインストールし、終わったら再起動する。
 * 起動時のダイアログと、設定の「バージョン情報」から使う。
 */
export function useUpdateInstall(update: Update | null) {
  const [progress, setProgress] = useState<DownloadProgress>(
    initialDownloadProgress,
  );

  const install = useMutation({
    mutationFn: () => {
      if (!update) throw new Error("更新が見つかりません");
      setProgress(initialDownloadProgress);
      return installUpdate(update, (event) => {
        setProgress((current) => applyDownloadEvent(current, event));
      });
    },
  });

  return {
    install: () => install.mutate(),
    installing: install.isPending,
    installError: install.error,
    /** 0〜100。全体の大きさが分からないあいだは `null` */
    percent: downloadPercent(progress),
  };
}
