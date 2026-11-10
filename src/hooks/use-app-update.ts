import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  applyDownloadEvent,
  type DownloadProgress,
  downloadPercent,
  initialDownloadProgress,
} from "@/lib/update-progress";
import { checkForUpdate, installUpdate } from "@/services/updater";

const updateKey = ["app-update"] as const;

/**
 * アプリの更新。`enabled` のとき、起動後に1回だけ新しいバージョンを確認する。
 * 確認に失敗しても(オフラインなど)何も出さない。更新がなくても困らないため。
 */
export function useAppUpdate({ enabled }: { enabled: boolean }) {
  const check = useQuery({
    queryKey: updateKey,
    queryFn: checkForUpdate,
    enabled,
    retry: false,
    // 起動ごとに1回で十分。再フォーカスや再接続では確認し直さない
    staleTime: Number.POSITIVE_INFINITY,
  });
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>(
    initialDownloadProgress,
  );

  const update = check.data ?? null;

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
    /** 新しいバージョン。なければ `null` */
    update,
    /** 「あとで」を選んだ(次の起動まで出さない) */
    dismissed,
    dismiss: () => setDismissed(true),
    install: () => install.mutate(),
    installing: install.isPending,
    installError: install.error,
    /** 0〜100。全体の大きさが分からないあいだは `null` */
    percent: downloadPercent(progress),
  };
}
