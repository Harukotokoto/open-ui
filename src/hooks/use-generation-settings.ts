import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGenerationSettings,
  updateGenerationSettings,
} from "@/services/generation-settings";
import type { GenerationSettings } from "@/types/bindings";

const generationKey = ["generation-settings"] as const;

/** 生成の設定。 */
export function useGenerationSettings() {
  return useQuery({
    queryKey: generationKey,
    queryFn: getGenerationSettings,
  });
}

/** 生成の設定を保存する。 */
export function useSaveGenerationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (generation: GenerationSettings) =>
      updateGenerationSettings(generation),
    onSuccess: (saved) => queryClient.setQueryData(generationKey, saved),
  });
}
