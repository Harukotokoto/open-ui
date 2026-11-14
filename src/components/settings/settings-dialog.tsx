import { useState } from "react";
import {
  type SettingsCategoryId,
  settingsCategories,
} from "@/components/settings/registry";
import { SettingsNav } from "@/components/settings/settings-nav";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { filterCategories } from "@/lib/settings-search";
import { useSettingsDialogStore } from "@/stores/settings-dialog-store";

/**
 * 設定のポップアップ。左にカテゴリ(検索つき)、右に選んだカテゴリの内容を出す。
 * 開閉と出すカテゴリは `useSettingsDialogStore` で決まる。アプリに1つだけ置く。
 */
export function SettingsDialog() {
  const open = useSettingsDialogStore((state) => state.open);
  const setOpen = useSettingsDialogStore((state) => state.setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="h-[min(40rem,calc(100svh-2rem))] gap-0 overflow-hidden bg-mac-window p-0 sm:max-w-3xl">
        <SettingsBody />
      </DialogContent>
    </Dialog>
  );
}

/** ダイアログの中身。閉じるたびに作り直され、検索欄も空に戻る。 */
function SettingsBody() {
  const category = useSettingsDialogStore((state) => state.category);
  const setCategory = useSettingsDialogStore((state) => state.setCategory);
  const [query, setQuery] = useState("");

  const visible = filterCategories(settingsCategories, query);
  // 絞り込みで外れても、いま開いているカテゴリの内容は出したままにする
  const active =
    settingsCategories.find((candidate) => candidate.id === category) ??
    settingsCategories[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 左上の閉じるボタン(top 19px・14px角)と縦の中心をそろえる */}
      <DialogHeader className="mac-material-titlebar h-13 shrink-0 justify-center border-b border-mac-separator px-12">
        <DialogTitle className="text-center text-mac-headline">
          設定
        </DialogTitle>
        <DialogDescription className="sr-only">
          アプリの設定を変更します。
        </DialogDescription>
      </DialogHeader>
      {/* 領域の幅で並びを変える。`@container` を付けた要素自身は変わらないので、1つ外に置く */}
      <div className="@container min-h-0 flex-1">
        <div className="flex h-full min-h-0 flex-col @2xl:flex-row">
          <SettingsNav
            categories={visible}
            activeId={active.id}
            query={query}
            onQueryChange={setQuery}
            onSelect={(id: SettingsCategoryId) => setCategory(id)}
          />
          <section
            aria-label={active.label}
            className="@container min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-5"
          >
            <h2 className="mb-4 text-mac-title-3 font-bold text-mac-label">
              {active.label}
            </h2>
            <div className="flex flex-col text-mac-body text-mac-label">
              <active.Panel />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
