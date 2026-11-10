import { useEffect } from "react";
import { useSaveConversation } from "@/hooks/use-history";
import { useActiveProfile } from "@/hooks/use-profiles";
import { bindChatSessions, chatSessions } from "@/services/chat/sessions";

/**
 * 会話の置き場(`chatSessions`)を画面につなぐ。チャット画面に1つだけ置く(会話を切り替えても外れない)。
 *
 * - 接続先と保存のしかたを差し込む。生成中の会話は、画面から外れたあとも、この接続先で保存される。
 * - `activeId` が変わったら、生成中でない別の会話を手放す。
 */
export function useChatSessionsHost(activeId: string) {
  const { profile } = useActiveProfile();
  const { mutate } = useSaveConversation();
  const profileId = profile?.id;

  useEffect(() => {
    bindChatSessions({ getProfileId: () => profileId, save: mutate });
  }, [profileId, mutate]);

  useEffect(() => {
    chatSessions.prune(activeId);
  }, [activeId]);
}
