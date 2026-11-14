import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { createMathPlugin } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import "katex/dist/katex.min.css";
import "streamdown/styles.css";
import { type Components, defaultTranslations, Streamdown } from "streamdown";
import { CUSTOM_COMPONENTS } from "@/components/markdown/custom";
import { SafeImage, SafeLink } from "@/components/markdown/safe-elements";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { toAllowedTags } from "@/lib/markdown/custom-tags";
import { cn } from "@/lib/utils";

// AIは数式を `$...$` で書くことが多いので、1つの `$` も数式にする(お金の `$` は `\$` と書いてもらう)
const math = createMathPlugin({ singleDollarTextMath: true });

const PLUGINS = { code, mermaid, math, cjk };

const ALLOWED_TAGS = toAllowedTags();

const COMPONENTS = {
  ...CUSTOM_COMPONENTS,
  a: SafeLink,
  img: SafeImage,
} as unknown as Components;

/**
 * 画面(WebView)からはファイルを保存できないので、ダウンロードのボタンは出さない。
 * コピーと拡大は出す。
 */
const CONTROLS = {
  code: { copy: true, download: false },
  table: { copy: true, download: false, fullscreen: true },
  mermaid: { copy: true, download: false, fullscreen: true, panZoom: true },
  image: false,
} as const;

/**
 * 文字ごとに、左から右へ順に浮かび上がる(`globals.css` の `sd-floatIn`)。日本語は単語の区切りが無いので、文字単位にする。
 * 同時に届いた文字は `stagger` ミリ秒ずつずらして始めるので、先頭から滑らかな波になる。
 */
const ANIMATION = {
  animation: "floatIn",
  sep: "char",
  duration: 500,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  stagger: 16,
  maxBacklogMs: 400,
} as const;

const TRANSLATIONS = {
  ...defaultTranslations,
  close: "閉じる",
  copied: "コピーしました",
  copyCode: "コードをコピー",
  copyTable: "表をコピー",
  copyTableAsCsv: "CSVでコピー",
  copyTableAsMarkdown: "Markdownでコピー",
  copyTableAsTsv: "TSVでコピー",
  errorMermaid: "図を表示できませんでした",
  exitFullscreen: "全画面を終了",
  imageNotAvailable: "画像を表示できません",
  mermaidAriaLabel: "図",
  resetView: "表示をリセット",
  viewFullscreen: "全画面で表示",
  zoomIn: "拡大",
  zoomOut: "縮小",
};

/**
 * Streamdownの既定の見た目への上書き(部品側のclassより強い、親からのセレクターで当てる)。
 * - 見出しは本文(14px)に対して大きすぎるので、macOSの文字スタイルに合わせる
 * - 箇条書きは、折り返した行が記号の下に回り込まないよう、記号を外に出してぶら下げる
 * - 引用は、日本語の斜体(疑似斜体)が読みにくいので傾けない
 */
const TYPOGRAPHY_CLASS = [
  "[&_[data-streamdown=heading-1]]:text-mac-title-1",
  "[&_[data-streamdown=heading-2]]:text-mac-title-2",
  "[&_[data-streamdown=heading-3]]:text-mac-title-3",
  "[&_[data-streamdown=heading-4]]:text-(length:--chat-font-size)",
  "[&_[data-streamdown=heading-5]]:text-(length:--chat-font-size)",
  "[&_[data-streamdown=heading-6]]:text-(length:--chat-font-size)",
  "[&_[data-streamdown=unordered-list]]:list-outside",
  "[&_[data-streamdown=unordered-list]]:pl-6",
  "[&_[data-streamdown=ordered-list]]:list-outside",
  "[&_[data-streamdown=ordered-list]]:pl-6",
  "[&_[data-streamdown=blockquote]]:my-0",
  "[&_[data-streamdown=blockquote]]:not-italic",
].join(" ");

interface MarkdownProps {
  children: string;
  /** 本文を出している最中か。`true` の間は書きかけの記法を整え、新しい文字をフェードインする。 */
  streaming?: boolean;
  className?: string;
}

/**
 * AIの返答のMarkdown。コードのカラーリング(Shiki)、Mermaid図、数式(KaTeX)、独自タグ
 * (`lib/markdown/custom-tags.ts` で定義し、`./custom` に部品を置く)に対応する。
 * リンクは移動せず、外部の画像は読み込まない。
 */
export function Markdown({
  children,
  streaming = false,
  className,
}: MarkdownProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Streamdown
      mode={streaming ? "streaming" : "static"}
      isAnimating={streaming}
      animated={streaming && !reducedMotion ? ANIMATION : false}
      plugins={PLUGINS}
      allowedTags={ALLOWED_TAGS}
      components={COMPONENTS}
      controls={CONTROLS}
      translations={TRANSLATIONS}
      className={cn("space-y-3", TYPOGRAPHY_CLASS, className)}
    >
      {children}
    </Streamdown>
  );
}
