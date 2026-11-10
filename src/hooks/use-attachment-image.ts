import { useQuery } from "@tanstack/react-query";
import { loadAttachmentImage } from "@/services/attachments";

/**
 * 画像の添付のサムネイル用の `data:` URL。保存した画像は変わらないので、一度読んだら使い回す。
 * 読めなかったとき(ファイルが消えているなど)は `undefined` のまま。
 */
export function useAttachmentImage(conversationId: string, id: string) {
  const query = useQuery({
    queryKey: ["attachment-image", conversationId, id],
    queryFn: () => loadAttachmentImage(conversationId, id),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return query.data
    ? `data:${query.data.mediaType};base64,${query.data.data}`
    : undefined;
}
