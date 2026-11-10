import type { ComponentType } from "react";
import type { CustomTagName } from "@/lib/markdown/custom-tags";
import { Callout } from "./callout";

/**
 * 独自タグごとの部品。`CUSTOM_TAGS`(`lib/markdown/custom-tags.ts`)に定義したタグは、
 * すべてここに部品が必要(足りないとコンパイルが通らない)。
 */
// biome-ignore lint/suspicious/noExplicitAny: 部品ごとに受け取る属性が違うため
export const CUSTOM_COMPONENTS: Record<CustomTagName, ComponentType<any>> = {
  callout: Callout,
};
