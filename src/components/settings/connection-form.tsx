import { useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  type KeyChange,
  useSaveConnection,
  useTestConnection,
} from "@/hooks/use-profiles";
import { errorMessage } from "@/services/ipc";
import type { ConnectionProfile, KeyStatus } from "@/types/bindings";

interface ConnectionFormProps {
  profile: ConnectionProfile;
  keyStatus: KeyStatus | undefined;
  /** 保存できたあとの処理 */
  onSaved?: () => void;
  /** 渡すと、保存せずに閉じるボタンを出す */
  onCancel?: () => void;
  /** 閉じるボタンの文字 */
  cancelLabel?: string;
}

/** 接続先の設定フォーム。名前・URL・APIキー・モデル名を編集し、接続を確かめて保存する。 */
export function ConnectionForm({
  profile,
  keyStatus,
  onSaved,
  onCancel,
  cancelLabel = "キャンセル",
}: ConnectionFormProps) {
  const ids = {
    name: useId(),
    baseUrl: useId(),
    apiKey: useId(),
    model: useId(),
    models: useId(),
  };
  const [name, setName] = useState(profile.name);
  const [baseUrl, setBaseUrl] = useState(profile.baseUrl);
  const [model, setModel] = useState(profile.selectedModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);

  const test = useTestConnection();
  const save = useSaveConnection();

  // 保存したあとに編集したら、「保存しました」は消す
  const edited = () => {
    if (save.isSuccess) save.reset();
  };

  const draft: ConnectionProfile = {
    ...profile,
    name: name.trim(),
    baseUrl: baseUrl.trim(),
    selectedModel: model.trim() === "" ? null : model.trim(),
  };

  const keyChange: KeyChange = clearKey
    ? { type: "clear" }
    : apiKey.trim() !== ""
      ? { type: "set", value: apiKey.trim() }
      : { type: "keep" };

  const handleTest = () => {
    // 入力があればそのキー、削除予定なら空、どちらでもなければ保存済みのキーを使う
    const keyForTest = clearKey
      ? ""
      : apiKey.trim() === ""
        ? null
        : apiKey.trim();
    test.mutate({ profile: draft, apiKey: keyForTest });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate(
      { profile: draft, keyChange },
      { onSuccess: () => onSaved?.() },
    );
  };

  const models = test.data ?? [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={ids.name}>名前</FieldLabel>
        <Input
          id={ids.name}
          value={name}
          onChange={(event) => {
            edited();
            setName(event.target.value);
          }}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={ids.baseUrl}>ベースURL</FieldLabel>
        <Input
          id={ids.baseUrl}
          type="url"
          inputMode="url"
          placeholder="http://localhost:1234/v1"
          value={baseUrl}
          onChange={(event) => {
            edited();
            setBaseUrl(event.target.value);
          }}
          required
        />
        <FieldDescription>
          OpenAI互換のAPIのURL(例: LM Studioならhttp://localhost:1234/v1)
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={ids.apiKey}>APIキー</FieldLabel>
        <Input
          id={ids.apiKey}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={
            keyStatus === "saved" ? "保存済み(変更するときだけ入力)" : ""
          }
          value={apiKey}
          disabled={clearKey}
          onChange={(event) => {
            edited();
            setApiKey(event.target.value);
          }}
        />
        <KeyStatusNote
          status={keyStatus}
          clearKey={clearKey}
          onToggleClear={() => {
            edited();
            setClearKey((value) => !value);
            setApiKey("");
          }}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={ids.model}>モデル名</FieldLabel>
        <Input
          id={ids.model}
          list={ids.models}
          autoComplete="off"
          spellCheck={false}
          placeholder="空ならサーバーの既定"
          value={model}
          onChange={(event) => {
            edited();
            setModel(event.target.value);
          }}
        />
        <datalist id={ids.models}>
          {models.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        <FieldDescription>
          接続を確かめると、見つかったモデルが候補に出ます。
        </FieldDescription>
      </Field>

      {test.isSuccess && (
        <Alert>
          <AlertTitle>接続できました</AlertTitle>
          <AlertDescription>
            {models.length > 0
              ? `モデルが${models.length}件見つかりました。`
              : "モデルの一覧は空でした。モデル名を直接入力してください。"}
          </AlertDescription>
        </Alert>
      )}
      {test.isError && (
        <Alert variant="destructive">
          <AlertTitle>接続できませんでした</AlertTitle>
          <AlertDescription>{errorMessage(test.error)}</AlertDescription>
        </Alert>
      )}
      {save.isSuccess && (
        <Alert>
          <AlertTitle>保存しました</AlertTitle>
        </Alert>
      )}
      {save.isError && (
        <Alert variant="destructive">
          <AlertTitle>保存できませんでした</AlertTitle>
          <AlertDescription>{errorMessage(save.error)}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={test.isPending || baseUrl.trim() === ""}
        >
          {test.isPending && <Spinner />}
          接続を確かめる
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Spinner />}
            保存
          </Button>
        </div>
      </div>
    </form>
  );
}

interface KeyStatusNoteProps {
  status: KeyStatus | undefined;
  clearKey: boolean;
  onToggleClear: () => void;
}

function KeyStatusNote({
  status,
  clearKey,
  onToggleClear,
}: KeyStatusNoteProps) {
  if (clearKey) {
    return (
      <FieldDescription>
        保存すると、保存済みのキーを削除します。{" "}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={onToggleClear}
        >
          取り消す
        </Button>
      </FieldDescription>
    );
  }
  if (status === "saved" || status === "unsaved") {
    return (
      <FieldDescription>
        {status === "saved"
          ? "OSの資格情報ストアに保存されています。"
          : "OSの資格情報ストアに保存できていません。アプリを終了すると失われます。"}{" "}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={onToggleClear}
        >
          削除する
        </Button>
      </FieldDescription>
    );
  }
  return (
    <FieldDescription>
      未設定です。キーが要らないサーバーは空のままで構いません。
    </FieldDescription>
  );
}
