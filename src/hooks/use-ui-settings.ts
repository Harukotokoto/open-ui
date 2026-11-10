import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUiSettings, updateUiSettings } from "@/services/ui-settings";
import type { UiSettings } from "@/types/bindings";

const uiSettingsKey = ["ui-settings"] as const;

/** 画面の設定(サイドバーの開閉など)。 */
export function useUiSettings() {
  return useQuery({
    queryKey: uiSettingsKey,
    queryFn: getUiSettings,
    // 起動後は画面が持つ状態が正で、読み直しで上書きしない
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

/** 画面の設定を保存する。 */
export function useUpdateUiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ui: UiSettings) => updateUiSettings(ui),
    onSuccess: (saved) => queryClient.setQueryData(uiSettingsKey, saved),
  });
}
