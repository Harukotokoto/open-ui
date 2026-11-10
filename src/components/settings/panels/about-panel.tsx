import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { UpdateRow } from "@/components/settings/update-row";
import { useAppInfo } from "@/hooks/use-app-info";

/** 「バージョン情報」。アプリのバージョンと、更新の確認。 */
export function AboutPanel() {
  const { data } = useAppInfo();

  return (
    <SettingSection title="バージョン情報">
      <SettingRow label="アプリ">{data?.name ?? "open-ui"}</SettingRow>
      <SettingRow label="バージョン">
        <span className="text-sm tabular-nums">
          {data ? `v${data.version}` : "…"}
        </span>
      </SettingRow>
      <UpdateRow />
    </SettingSection>
  );
}
