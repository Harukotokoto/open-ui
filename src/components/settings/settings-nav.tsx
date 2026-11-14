import type {
  SettingsCategory,
  SettingsCategoryId,
} from "@/components/settings/registry";
import { IconTile } from "@/components/ui/icon-tile";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  categories: readonly SettingsCategory[];
  activeId: SettingsCategoryId;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: SettingsCategoryId) => void;
}

/**
 * 設定の左ナビ(システム設定のサイドバー)。上に検索欄、下に色付きアイコンのカテゴリ。
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
    <div className="mac-material-sidebar flex shrink-0 flex-col gap-3 border-b border-mac-separator p-3 @2xl:w-56 @2xl:overflow-y-auto @2xl:border-r @2xl:border-b-0">
      <SearchField
        variant="filled"
        size="lg"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="検索"
        aria-label="設定を検索"
        autoComplete="off"
      />

      <nav aria-label="設定のカテゴリ">
        {categories.length === 0 ? (
          <p className="px-2 py-1.5 text-mac-body text-mac-label-secondary">
            見つかりませんでした
          </p>
        ) : (
          <ul className="flex gap-0.5 overflow-x-auto @2xl:flex-col @2xl:overflow-visible">
            {categories.map(({ id, label, icon: Icon, tile }) => {
              const active = id === activeId;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(id)}
                    className={cn(
                      "flex h-7 w-full cursor-default items-center gap-2 rounded-md px-1.5 text-left text-mac-body whitespace-nowrap text-mac-label outline-none focus-visible:mac-focus-ring",
                      active
                        ? "bg-mac-accent text-mac-accent-foreground"
                        : "hover:bg-mac-fill-tertiary",
                    )}
                  >
                    <IconTile color={tile} aria-hidden>
                      <Icon />
                    </IconTile>
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </div>
  );
}
