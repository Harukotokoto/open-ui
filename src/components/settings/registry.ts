import type { VariantProps } from "class-variance-authority";
import {
  InfoIcon,
  PlugIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { AboutPanel } from "@/components/settings/panels/about-panel";
import { ConnectionPanel } from "@/components/settings/panels/connection-panel";
import { GeneralPanel } from "@/components/settings/panels/general-panel";
import { GenerationPanel } from "@/components/settings/panels/generation-panel";
import type { iconTileVariants } from "@/components/ui/icon-tile";

type IconTileColor = VariantProps<typeof iconTileVariants>["color"];

export type SettingsCategoryId =
  | "general"
  | "connection"
  | "generation"
  | "about";

export interface SettingsCategory {
  id: SettingsCategoryId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** ナビに出すアイコンの下地の色(システム設定のように、カテゴリごとに変える) */
  tile: NonNullable<IconTileColor>;
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
    tile: "gray",
    keywords: [
      "外観",
      "テーマ",
      "ライト",
      "ダーク",
      "システム",
      "アクセントカラー",
      "色",
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
    tile: "blue",
    keywords: ["サーバー", "URL", "APIキー", "モデル", "OpenAI"],
    Panel: ConnectionPanel,
  },
  {
    id: "generation",
    label: "生成",
    icon: SlidersHorizontalIcon,
    tile: "purple",
    keywords: ["システムプロンプト", "temperature", "トークン", "返答"],
    Panel: GenerationPanel,
  },
  {
    id: "about",
    label: "バージョン情報",
    icon: InfoIcon,
    tile: "graphite",
    keywords: ["バージョン", "更新", "アップデート", "今すぐ確認", "最新"],
    Panel: AboutPanel,
  },
];
