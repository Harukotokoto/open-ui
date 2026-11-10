import { useMutation } from "@tanstack/react-query";
import { useUpdateInstall } from "@/hooks/use-update-install";
import { checkForUpdate } from "@/services/updater";

/**
 * 設定の「今すぐ確認」。押したときだけ新しいバージョンを確認する。
 * 起動時の確認(`useAppUpdate`)とは別に動くので、確認した結果で起動時のダイアログが開くことはない。
 * 起動時と違い、確認に失敗したら理由を返す。
 */
export function useUpdateCheck() {
  const check = useMutation({ mutationFn: checkForUpdate });
  // 確認の前は `undefined`、最新なら `null`
  const update = check.data ?? null;

  return {
    check: () => check.mutate(),
    checking: check.isPending,
    checkError: check.error,
    /** 確認を終えたか(成功したときだけ) */
    checked: check.isSuccess,
    /** 新しいバージョン。なければ `null` */
    update,
    ...useUpdateInstall(update),
  };
}
