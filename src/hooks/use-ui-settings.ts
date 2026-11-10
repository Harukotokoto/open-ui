import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUiSettings, updateUiSettings } from "@/services/ui-settings";
import type { UiSettings } from "@/types/bindings";

const uiSettingsKey = ["ui-settings"] as const;

/** 画面の設定(サイドバーの開閉・テーマ)。 */
export function useUiSettings() {
  return useQuery({
    queryKey: uiSettingsKey,
    queryFn: getUiSettings,
    // 起動後は画面が持つ状態が正で、読み直しで上書きしない
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

/**
 * 画面の設定を一部だけ変えて保存する。指定しなかった項目は、いまの値のまま残す。
 * 画面にはすぐ反映し、保存に失敗したら元に戻す。
 */
export function useUpdateUiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UiSettings>) =>
      updateUiSettings({
        ...queryClient.getQueryData<UiSettings>(uiSettingsKey),
        ...patch,
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: uiSettingsKey });
      const previous = queryClient.getQueryData<UiSettings>(uiSettingsKey);
      queryClient.setQueryData<UiSettings>(uiSettingsKey, {
        ...previous,
        ...patch,
      });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      queryClient.setQueryData(uiSettingsKey, context?.previous);
    },
    onSuccess: (saved) => queryClient.setQueryData(uiSettingsKey, saved),
  });
}
