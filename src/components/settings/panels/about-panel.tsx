import { SettingRow, SettingSection } from "@/components/settings/setting-row";
import { UpdateRow } from "@/components/settings/update-row";
import { useAppInfo } from "@/hooks/use-app-info";

/** 「バージョン情報」。アプリのバージョンと、更新の確認。 */
export function AboutPanel() {
  const { data } = useAppInfo();

  return (
    <SettingSection title="このアプリ">
      <SettingRow label="アプリ">
        <span className="text-mac-label-secondary">
          {data?.name ?? "open-ui"}
        </span>
      </SettingRow>
      <SettingRow label="バージョン">
        <span className="text-mac-label-secondary tabular-nums">
          {data ? `v${data.version}` : "…"}
        </span>
      </SettingRow>
      <UpdateRow />
    </SettingSection>
  );
}
