import type { ReactNode } from "react";

interface SafeLinkProps {
  href?: string;
  children?: ReactNode;
}

/**
 * Markdownのリンク。クリックしても移動しない。
 * アプリの画面(WebView)が外部のページに切り替わらないようにするため。URLはホバーで確認できる。
 * 外部ブラウザで開く機能は、それを許可する設計をしたときに足す。
 */
export function SafeLink({ href, children }: SafeLinkProps) {
  return (
    <span
      data-slot="markdown-link"
      title={href}
      className="cursor-text underline decoration-muted-foreground underline-offset-4"
    >
      {children}
    </span>
  );
}

interface SafeImageProps {
  alt?: string;
}

/**
 * Markdownの画像。外部の画像は読み込まない(アクセス元の漏えいを防ぐ)ので、代替テキストだけを出す。
 */
export function SafeImage({ alt }: SafeImageProps) {
  return (
    <span data-slot="markdown-image" className="text-muted-foreground">
      [画像{alt ? `: ${alt}` : ""}]
    </span>
  );
}
