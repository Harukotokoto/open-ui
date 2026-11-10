import { ConnectionForm } from "@/components/settings/connection-form";
import { SettingSection } from "@/components/settings/setting-row";
import { Spinner } from "@/components/ui/spinner";
import { useActiveProfile, useKeyStatus } from "@/hooks/use-profiles";

/** 「接続」。使用するOpenAI互換サーバーの設定。複数のプロファイルの管理は後のステップ。 */
export function ConnectionPanel() {
  const { profile } = useActiveProfile();
  const { data: keyStatus } = useKeyStatus(profile?.id);

  return (
    <SettingSection title="接続">
      <p className="pb-4 text-xs text-muted-foreground">
        使用するOpenAI互換サーバーを設定します。
      </p>
      {profile ? (
        <ConnectionForm
          key={profile.id}
          profile={profile}
          keyStatus={keyStatus}
        />
      ) : (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
    </SettingSection>
  );
}
