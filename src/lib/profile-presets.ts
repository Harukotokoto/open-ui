import type { ProfilePreset } from "@/types/bindings";

export interface ProfilePresetOption {
  id: ProfilePreset;
  label: string;
  /** メニューに添える説明 */
  hint: string;
}

/**
 * プロファイルを追加するときの選択肢(メニューに出る順)。
 * 名前とURLの初期値はRust側(`ProfilePreset`)が持つ。ここは表示だけ。
 */
export const profilePresetOptions: readonly ProfilePresetOption[] = [
  { id: "lmStudio", label: "LM Studio", hint: "localhost:1234" },
  { id: "ollama", label: "Ollama", hint: "localhost:11434" },
  { id: "llamaCpp", label: "llama.cpp", hint: "localhost:8080" },
  { id: "vllm", label: "vLLM", hint: "localhost:8000" },
  { id: "custom", label: "カスタム", hint: "OpenAI互換のサーバー" },
];
