import { Markdown } from "@/components/markdown/markdown";
import { useSmoothText } from "@/hooks/use-smooth-text";

interface ReplyTextProps {
  text: string;
  /** この本文がいま届いている最中か。 */
  streaming: boolean;
}

/** 返答の本文。少し遅らせて、フェードインしながら順に出す(保存済みの会話は、すぐ全文を出す)。 */
export function ReplyText({ text, streaming }: ReplyTextProps) {
  const smooth = useSmoothText(text, streaming);
  return <Markdown streaming={smooth.revealing}>{smooth.text}</Markdown>;
}
