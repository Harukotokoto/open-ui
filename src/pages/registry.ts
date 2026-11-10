import type { ComponentType } from "react";
import { ChatPage } from "@/pages/chat/chat-page";

/** 画面の登録リスト。画面を足すときはここに1件追加する。 */
export const pages = {
  chat: ChatPage,
} satisfies Record<string, ComponentType>;

export type PageId = keyof typeof pages;
