import type { ConnectionProfile, ProfileBook } from "@/types/bindings";

/** モデルを選んでいない(サーバーの既定を使う)ときの、開くボタンの表示。 */
export const DEFAULT_MODEL_LABEL = "モデル";

/** 使用中のプロファイルで選んでいるモデル名。選んでいなければ `null`。 */
export function activeModel(book: ProfileBook): string | null {
  const active = book.profiles.find((p) => p.id === book.activeId);
  return active?.selectedModel ?? null;
}

/** 開くボタンに出す文字。選んでいるモデル名、無ければ「モデル」。 */
export function selectionLabel(book: ProfileBook): string {
  return activeModel(book) ?? DEFAULT_MODEL_LABEL;
}

/**
 * そのプロファイルの `model`(`null` はサーバーの既定)が、いま選ばれているか。
 * 使用中のプロファイルのものだけが選ばれている扱いになる。
 */
export function isModelSelected(
  book: ProfileBook,
  profileId: string,
  model: string | null,
): boolean {
  if (book.activeId !== profileId) return false;
  const profile = book.profiles.find((p) => p.id === profileId);
  return (profile?.selectedModel ?? null) === model;
}

/**
 * 検索の絞り込み(cmdkの `filter` に渡す)。入力を空白で区切った語がすべて、
 * `keywords`(モデル名・プロファイル名など)のどれかに、大文字小文字を区別せず含まれれば一致(1)、
 * そうでなければ不一致(0)。モデルのIDは「qwen3-30b」のように記号が多いので、あいまい検索はしない。
 */
export function matchesModelQuery(
  _value: string,
  search: string,
  keywords: readonly string[] = [],
): number {
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const haystack = keywords.map((keyword) => keyword.toLowerCase());
  return terms.every((term) => haystack.some((text) => text.includes(term)))
    ? 1
    : 0;
}

/**
 * プロファイルのモデルの候補。保存済みの選択モデルがサーバーの一覧に無い
 * (取得できなかった・削除された)ときも、選択中だと分かるよう先頭に足す。
 */
export function modelOptions(
  profile: ConnectionProfile,
  fetched: readonly string[] | undefined,
): string[] {
  const models = fetched ?? [];
  const selected = profile.selectedModel;
  return selected && !models.includes(selected)
    ? [selected, ...models]
    : [...models];
}
