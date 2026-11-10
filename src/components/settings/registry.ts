import { PlugIcon, SettingsIcon, SlidersHorizontalIcon } from "lucide-react";
import type { ComponentType } from "react";
import { ConnectionPanel } from "@/components/settings/panels/connection-panel";
import { GeneralPanel } from "@/components/settings/panels/general-panel";
import { GenerationPanel } from "@/components/settings/panels/generation-panel";

export type SettingsCategoryId = "general" | "connection" | "generation";

export interface SettingsCategory {
  id: SettingsCategoryId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** ラベルに無い項目名。設定内の検索で、このカテゴリが見つかるようにする */
  keywords: readonly string[];
  Panel: ComponentType;
}

/**
 * 設定のカテゴリの登録リスト。ここに1件足すと、左のナビと右の内容に出る
 * (⑦でパーソナライズ・メモリ・MCPを足す)。
 */
export const settingsCategories: readonly SettingsCategory[] = [
  {
    id: "general",
    label: "一般",
    icon: SettingsIcon,
    keywords: [
      "外観",
      "テーマ",
      "ライト",
      "ダーク",
      "システム",
      "入力",
      "Shift",
      "Enter",
      "改行",
      "送信",
    ],
    Panel: GeneralPanel,
  },
  {
    id: "connection",
    label: "接続",
    icon: PlugIcon,
    keywords: ["サーバー", "URL", "APIキー", "モデル", "OpenAI"],
    Panel: ConnectionPanel,
  },
  {
    id: "generation",
    label: "生成",
    icon: SlidersHorizontalIcon,
    keywords: ["システムプロンプト", "temperature", "トークン", "返答"],
    Panel: GenerationPanel,
  },
];
