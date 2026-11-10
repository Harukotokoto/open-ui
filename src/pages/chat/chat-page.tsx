import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/hooks/use-app-info";

/** チャット画面。土台(⓪)ではプレースホルダー。チャット本体は①で作る。 */
export function ChatPage() {
  const { data, isError, refetch } = useAppInfo();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-serif text-3xl">open-ui</h1>
      <p className="text-muted-foreground">
        OpenAI互換サーバー向けのUIクライアント
      </p>
      {data && (
        <p className="text-sm text-muted-foreground">
          {data.name} v{data.version}
        </p>
      )}
      {isError && (
        <Button variant="outline" onClick={() => refetch()}>
          バージョン情報を再取得
        </Button>
      )}
    </main>
  );
}
