import type { ReactNode } from "react";

/** 会話が空のときの画面。挨拶と、中央の入力欄(`children`)。 */
export function Welcome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-5 pb-[12vh]">
      <h1 className="welcome-title text-center text-balance text-mac-label">
        今日は何をしましょうか?
      </h1>
      <div className="w-full max-w-(--chat-column-width)">{children}</div>
    </div>
  );
}
