import { useState } from "react";
import { AddProfileMenu } from "@/components/settings/add-profile-menu";
import { DeleteProfileDialog } from "@/components/settings/delete-profile-dialog";
import { ProfileCard } from "@/components/settings/profile-card";
import { SettingSection } from "@/components/settings/setting-row";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  useAddProfile,
  useProfiles,
  useSetActiveProfile,
} from "@/hooks/use-profiles";
import { errorMessage } from "@/services/ipc";
import type { ConnectionProfile, ProfilePreset } from "@/types/bindings";

/** 「接続」。接続先(プロファイル)の一覧と、追加・編集・使用中の切り替え・削除。 */
export function ConnectionPanel() {
  const { data: book } = useProfiles();
  const add = useAddProfile();
  const activate = useSetActiveProfile();
  // 編集フォームを開いている接続先(1つだけ開く)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ConnectionProfile | null>(null);

  const handleAdd = (preset: ProfilePreset) => {
    add.mutate(preset, {
      // 追加したものは、URLなどをすぐ直せるように開く
      onSuccess: ({ id }) => setEditingId(id),
    });
  };

  return (
    <SettingSection title="接続先" plain>
      <div className="flex flex-wrap items-center justify-between gap-2 px-[11px] pb-3">
        <p className="text-mac-subheadline text-mac-label-secondary">
          使用するOpenAI互換サーバーを管理します。
        </p>
        <AddProfileMenu onAdd={handleAdd} pending={add.isPending} />
      </div>
      {add.isError && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{errorMessage(add.error)}</AlertDescription>
        </Alert>
      )}
      {activate.isError && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{errorMessage(activate.error)}</AlertDescription>
        </Alert>
      )}
      {book ? (
        <ul className="flex flex-col gap-3">
          {book.profiles.map((profile) => (
            <li key={profile.id}>
              <ProfileCard
                profile={profile}
                active={profile.id === book.activeId}
                editing={profile.id === editingId}
                onlyOne={book.profiles.length === 1}
                activating={
                  activate.isPending && activate.variables === profile.id
                }
                onActivate={() => activate.mutate(profile.id)}
                onToggleEdit={() =>
                  setEditingId((current) =>
                    current === profile.id ? null : profile.id,
                  )
                }
                onDelete={() => setDeleting(profile)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      )}
      <DeleteProfileDialog
        profile={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(id) => {
          setEditingId((current) => (current === id ? null : current));
        }}
      />
    </SettingSection>
  );
}
