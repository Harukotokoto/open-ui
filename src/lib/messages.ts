import type { UIMessage } from "ai";

/** メッセージの本文(textパーツをつないだもの)。 */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}
