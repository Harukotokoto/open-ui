import { create } from "zustand";
import type { SettingsCategoryId } from "@/components/settings/registry";

interface SettingsDialogState {
  open: boolean;
  /** 開いているカテゴリ。閉じても覚えていて、次に開くときも同じカテゴリから始める */
  category: SettingsCategoryId;
  /** 設定を開く。`category` を渡すと、そのカテゴリを出す */
  show: (category?: SettingsCategoryId) => void;
  setOpen: (open: boolean) => void;
  setCategory: (category: SettingsCategoryId) => void;
}

/** 設定ダイアログの開閉と、出しているカテゴリ。どの画面からでも開けるよう、ストアに置く。 */
export const useSettingsDialogStore = create<SettingsDialogState>((set) => ({
  open: false,
  category: "general",
  show: (category) =>
    set((state) => ({ open: true, category: category ?? state.category })),
  setOpen: (open) => set({ open }),
  setCategory: (category) => set({ category }),
}));
