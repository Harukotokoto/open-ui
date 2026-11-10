import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useUpdateInstall } from "@/hooks/use-update-install";
import { checkForUpdate } from "@/services/updater";

const updateKey = ["app-update"] as const;

/**
 * アプリの更新。`enabled` のとき、起動後に1回だけ新しいバージョンを確認する。
 * 確認に失敗しても(オフラインなど)何も出さない。更新がなくても困らないため。
 * 設定の「今すぐ確認」は別に確認する(`useUpdateCheck`)ので、ここの結果は変わらない。
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

  const update = check.data ?? null;

  return {
    /** 新しいバージョン。なければ `null` */
    update,
    /** 「あとで」を選んだ(次の起動まで出さない) */
    dismissed,
    dismiss: () => setDismissed(true),
    ...useUpdateInstall(update),
  };
}
