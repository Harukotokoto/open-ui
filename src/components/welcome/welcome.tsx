import type { ReactNode } from "react";

/** 会話が空のときの画面。挨拶と、中央の入力欄(`children`)。 */
export function Welcome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-16">
      <h1 className="text-center font-serif text-3xl sm:text-4xl">
        今日は何をしましょうか?
      </h1>
      <div className="w-full max-w-3xl">{children}</div>
    </div>
  );
}
