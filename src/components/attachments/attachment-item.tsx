import { FileTextIcon, XIcon } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { useAttachmentImage } from "@/hooks/use-attachment-image";
import { formatSize, kindLabel } from "@/lib/attachments";

export interface AttachmentItemData {
  id: string;
  filename: string;
  mediaType: string;
  /** バイト数。会話に残した添付では分からないので省ける。 */
  size?: number;
}

interface AttachmentItemProps extends AttachmentItemData {
  conversationId: string;
  /** 指定すると、外すボタンが出る(入力欄のとき)。 */
  onRemove?: () => void;
}

/** 添付1件の表示。画像はサムネイル、それ以外はアイコンを出す。 */
export function AttachmentItem({
  conversationId,
  id,
  filename,
  mediaType,
  size,
  onRemove,
}: AttachmentItemProps) {
  const isImage = mediaType.startsWith("image/");
  return (
    <Attachment size="sm" className="max-w-56 min-w-0 bg-background">
      <AttachmentMedia variant={isImage ? "image" : "icon"}>
        {isImage ? (
          <Thumbnail conversationId={conversationId} id={id} alt={filename} />
        ) : (
          <FileTextIcon />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle title={filename}>{filename}</AttachmentTitle>
        <AttachmentDescription>
          {size === undefined
            ? kindLabel(mediaType)
            : `${kindLabel(mediaType)} · ${formatSize(size)}`}
        </AttachmentDescription>
      </AttachmentContent>
      {onRemove && (
        <AttachmentActions>
          <AttachmentAction
            type="button"
            onClick={onRemove}
            aria-label={`${filename}を外す`}
          >
            <XIcon />
          </AttachmentAction>
        </AttachmentActions>
      )}
    </Attachment>
  );
}

function Thumbnail({
  conversationId,
  id,
  alt,
}: {
  conversationId: string;
  id: string;
  alt: string;
}) {
  const src = useAttachmentImage(conversationId, id);
  // 読み込み中や、ファイルが無いときは、枠だけ出す
  return src ? <img src={src} alt={alt} /> : null;
}
