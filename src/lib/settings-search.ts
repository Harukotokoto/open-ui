import { normalizeForSearch } from "@/lib/history-search";

/** 設定のカテゴリのうち、検索に使う部分。 */
interface Searchable {
  label: string;
  /** ラベルに無くても、この語で見つかるようにする(項目名など) */
  keywords: readonly string[];
}

/**
 * カテゴリを検索語で絞り込む。空白で区切った語をすべて、名前かキーワードのどれかに含むものを残す。
 * 語が無ければ、渡されたものをそのまま返す。並びは変えない。
 */
export function filterCategories<T extends Searchable>(
  categories: readonly T[],
  query: string,
): T[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...categories];
  return categories.filter((category) => {
    const haystack = [category.label, ...category.keywords]
      .map(normalizeForSearch)
      .join("\n");
    return terms.every((term) => haystack.includes(term));
  });
}
