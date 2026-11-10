import { unwrap } from "@/services/ipc";
import { commands, type GenerationSettings } from "@/types/bindings";

/** 保存されている生成の設定(システムプロンプト・temperature・最大トークン数)。 */
export function getGenerationSettings(): Promise<GenerationSettings> {
  return unwrap(commands.generationSettingsGet());
}

/** 生成の設定を保存する。値が正しくなければ拒否される。 */
export function updateGenerationSettings(
  generation: GenerationSettings,
): Promise<GenerationSettings> {
  return unwrap(commands.generationSettingsUpdate(generation));
}
