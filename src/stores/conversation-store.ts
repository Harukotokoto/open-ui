import { create } from "zustand";

interface ConversationState {
  /** いま開いている会話のID。まだ保存していない新しい会話のIDも入る。 */
  activeId: string;
  /** 保存済みの会話か(開くときにファイルから読む)。新しい会話は `false`。 */
  existing: boolean;
  /** 保存済みの会話を開く。すでに開いているものなら何もしない。 */
  open: (id: string) => void;
  /** 新しい会話を始める。 */
  startNew: () => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  activeId: crypto.randomUUID(),
  existing: false,
  open: (id) =>
    set((state) =>
      state.activeId === id ? state : { activeId: id, existing: true },
    ),
  startNew: () => set({ activeId: crypto.randomUUID(), existing: false }),
}));
