/**
 * ストリーミングの本文を、少し遅らせてなめらかに見せるための計算(純粋関数)。
 *
 * 受け取った文字を、そのまま画面に出さない。
 * 1. 届いてから `REVEAL_LAG_MS` ほど置く(余裕)。タグや記法が完成するのを待てる。
 * 2. 書きかけのタグ(`<callout type="wa` など)は、閉じるまで出さない。
 * 3. 溜まった分を、時間に比例した一定の速さで流す(一度に出さない)。
 */

/** 届いた文字を画面に出すまで置く時間(ミリ秒)。 */
export const REVEAL_LAG_MS = 150;

/** 書きかけのタグを探す範囲(文字数)。これより長いタグは見ない。 */
const TAG_WINDOW = 300;

const isTagStart = (char: string | undefined) =>
  char !== undefined && /[A-Za-z/!?]/.test(char);

/**
 * `text` の先頭から `end` 文字までのうち、画面に出してよい長さ。
 * 末尾が書きかけのタグ(`<` で始まり、まだ `>` が来ていない)なら、その手前までにする。
 * `a < b` のように、`<` のあとが空白などならタグとは見なさない。
 */
export function revealableLength(text: string, end: number): number {
  const limit = Math.min(Math.max(end, 0), text.length);
  let tagStart = -1;
  let quote: string | null = null;
  for (let i = Math.max(0, limit - TAG_WINDOW); i < limit; i++) {
    const char = text[i];
    if (tagStart === -1) {
      // 末尾の `<` は、次に届く文字でタグになるかもしれないので止める
      if (char === "<" && (i + 1 >= text.length || isTagStart(text[i + 1]))) {
        tagStart = i;
        quote = null;
      }
    } else if (quote !== null) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      tagStart = -1;
    }
  }
  return tagStart === -1 ? limit : tagStart;
}

/** サロゲートペア(絵文字など)の途中で切らない長さにそろえる。 */
export function alignToCharBoundary(text: string, length: number): number {
  if (length <= 0 || length >= text.length) return Math.max(length, 0);
  const code = text.charCodeAt(length - 1);
  const splitsPair = code >= 0xd800 && code <= 0xdbff;
  return splitsPair ? length + 1 : length;
}

/** 通常時の最低速度(文字/秒)。溜まりが少なくても、この速さで一定に流す。 */
const MIN_CPS = 45;
/** 受信が終わって出し切るときの最低速度(文字/秒)。 */
const FINISH_MIN_CPS = 150;
/** 溜まった分を、この時間(秒)ほどで追いつくように速度を上げる。 */
const CATCH_UP_SECONDS = 0.4;
const FINISH_CATCH_UP_SECONDS = 0.2;

/**
 * `dtMs` ミリ秒のあいだに進める文字数(小数)。
 * 一定の最低速度で流し、溜まりが増えたら追いつけるように速くする。フレームごとの端数は呼び出し側で持ち越す。
 * `finishing` は、受信が終わって残りを出し切るとき(少し速くする)。
 */
export function revealAdvance(
  backlog: number,
  dtMs: number,
  finishing: boolean,
): number {
  if (backlog <= 0 || dtMs <= 0) return 0;
  const minCps = finishing ? FINISH_MIN_CPS : MIN_CPS;
  const catchUp = finishing ? FINISH_CATCH_UP_SECONDS : CATCH_UP_SECONDS;
  const cps = Math.max(minCps, backlog / catchUp);
  return Math.min(backlog, (cps * dtMs) / 1000);
}
