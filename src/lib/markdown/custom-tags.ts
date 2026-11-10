/**
 * AIが返答の中で使える独自タグの定義(部品を使うための約束)。
 *
 * ここには React を置かない。タグ名・属性・「AIへの説明」だけを持ち、
 * - 画面は、`components/markdown/custom/` がタグ名ごとの部品を用意する
 * - AIには、`buildFormatGuide()` が作る説明を、システムプロンプトの後ろに足して伝える
 *
 * 新しい独自タグを足すときは、ここに定義を足し、`components/markdown/custom/index.ts` に部品を足す
 * (部品が無いとコンパイルが通らない)。
 */

export interface CustomTagSpec {
  /** 許可する属性。ここに無い属性は、サニタイズで取り除かれる。 */
  attributes: readonly string[];
  /** AIへの説明(英語。使い方・使いどころ・書き方の注意)。 */
  guide: string;
}

export const CUSTOM_TAGS = {
  callout: {
    attributes: ["type", "title"],
    guide: `<callout type="note|tip|warning|danger" title="Optional short title">
Body written in Markdown.
</callout>

Use a callout for something the reader must not miss: an important note, a tip, a warning about a pitfall, or a dangerous or irreversible action. \`type\` is one of note, tip, warning, danger (default: note). Use it sparingly (one or two per reply at most) and never wrap the whole answer in it. Do not put a callout inside a list or a table.`,
  },
} as const satisfies Record<string, CustomTagSpec>;

export type CustomTagName = keyof typeof CUSTOM_TAGS;

/** `Streamdown` の `allowedTags` の形(タグ名 → 許可する属性)。 */
export function toAllowedTags(
  tags: Record<string, CustomTagSpec> = CUSTOM_TAGS,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(tags).map(([name, spec]) => [name, [...spec.attributes]]),
  );
}

const MARKDOWN_GUIDE = `# Reply formatting

Your replies are rendered as Markdown. Use formatting only where it helps the reader; plain paragraphs are fine for conversation.

- GitHub Flavored Markdown: headings, lists, task lists, tables, strikethrough, links.
- Code: always use fenced code blocks with a language tag (\`\`\`ts, \`\`\`python, \`\`\`bash...). They are syntax-highlighted and have a copy button. Use \`inline code\` for identifiers.
- Diagrams: write Mermaid in a \`\`\`mermaid fenced block (flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt...). Use a diagram only when it explains more than text would. Keep node labels short, and wrap labels that contain brackets, parentheses or quotes in double quotes.
- Math: inline $...$ and display $$...$$ (KaTeX). Write a literal dollar sign as \\$ (for example prices).
- Images from the web are not loaded, so do not use image Markdown for external URLs. Do not write other raw HTML.`;

const TAGS_INTRO =
  "# Custom components\n\nBesides Markdown you can use these tags. Write a tag on its own line, and put a blank line after the opening tag and before the closing tag so the body is parsed as Markdown. Use only the attributes shown.";

/** AIに伝える書式の説明。Markdownで使える記法と、独自タグの使い方。 */
export function buildFormatGuide(
  tags: Record<string, CustomTagSpec> = CUSTOM_TAGS,
): string {
  const entries = Object.entries(tags);
  if (entries.length === 0) return MARKDOWN_GUIDE;
  const sections = entries.map(([name, spec]) => `## ${name}\n\n${spec.guide}`);
  return [MARKDOWN_GUIDE, TAGS_INTRO, ...sections].join("\n\n");
}
