import { SearchIcon } from "lucide-react";
import type {
  SettingsCategory,
  SettingsCategoryId,
} from "@/components/settings/registry";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  categories: readonly SettingsCategory[];
  activeId: SettingsCategoryId;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: SettingsCategoryId) => void;
}

/**
 * 設定の左ナビ。上に検索欄、下にカテゴリの一覧。
 * 領域が広いと縦に並べ、狭いと横に並べて横スクロールにする(親の `@container` で決まる)。
 */
export function SettingsNav({
  categories,
  activeId,
  query,
  onQueryChange,
  onSelect,
}: SettingsNavProps) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b p-3 @2xl:w-60 @2xl:overflow-y-auto @2xl:border-r @2xl:border-b-0">
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="検索"
          aria-label="設定を検索"
          autoComplete="off"
          className="h-8 w-full rounded-lg bg-foreground/5 py-1 pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <nav aria-label="設定のカテゴリ" className="flex flex-col gap-1">
        <p className="hidden px-2 text-xs text-muted-foreground @2xl:block">
          環境設定
        </p>
        {categories.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            見つかりませんでした
          </p>
        ) : (
          <ul className="flex gap-1 overflow-x-auto @2xl:flex-col @2xl:overflow-visible">
            {categories.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  aria-current={id === activeId ? "page" : undefined}
                  onClick={() => onSelect(id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm whitespace-nowrap outline-none transition-colors hover:bg-foreground/5",
                    id === activeId && "bg-foreground/10",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
}
