import { AppShell } from "@/components/layout/app-shell";
import { pages } from "@/pages/registry";

/** 現状は画面が1つだけ(チャット)。画面を足すときは `pages/registry.ts` に登録する。 */
export default function App() {
  const Page = pages.chat;
  return (
    <AppShell>
      <Page />
    </AppShell>
  );
}
