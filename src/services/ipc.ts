import type { AppError, AppErrorKind } from "@/types/bindings";

/** Rust のコマンドが返す `Result` を、成功なら値、失敗なら例外にして取り出す。 */
type CommandResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; error: AppError };

/** Rust の `AppError` を例外にしたもの。`kind` で表示を出し分けられる。 */
export class AppCommandError extends Error {
  readonly kind: AppErrorKind;

  constructor(error: AppError) {
    super(error.message);
    this.name = "AppCommandError";
    this.kind = error.kind;
  }
}

export async function unwrap<T>(result: Promise<CommandResult<T>>): Promise<T> {
  const settled = await result;
  if (settled.status === "error") {
    throw new AppCommandError(settled.error);
  }
  return settled.data;
}

/** 例外から、ユーザーに見せるメッセージを取り出す。 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error) {
    return error;
  }
  return "不明なエラーが発生しました";
}
