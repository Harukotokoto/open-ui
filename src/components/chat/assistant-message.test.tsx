import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { AssistantMessage } from "./assistant-message";

function reply(metadata?: unknown): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [{ type: "text", text: "こんにちは", state: "done" }],
    metadata,
  };
}

const stats = { tokens: 60, elapsedMs: 2000, estimated: false };

describe("AssistantMessage", () => {
  it("保存済みの返答は、Markdownとして全文をすぐ出す", () => {
    render(
      <AssistantMessage
        message={{
          ...reply(),
          parts: [{ type: "text", text: "**重要**です", state: "done" }],
        }}
        streaming={false}
      />,
    );

    expect(screen.getByText("重要")).toHaveAttribute(
      "data-streamdown",
      "strong",
    );
  });

  it("出力が終わったら、下に小さくtokens/sを出す", () => {
    render(<AssistantMessage message={reply({ stats })} streaming={false} />);

    expect(screen.getByText("30.0 tokens/s")).toBeInTheDocument();
  });

  it("生成中は、tokens/sを出さない", () => {
    render(<AssistantMessage message={reply({ stats })} streaming />);

    expect(screen.queryByText(/tokens\/s/)).not.toBeInTheDocument();
  });

  it("統計が無い返答には、何も出さない", () => {
    render(<AssistantMessage message={reply()} streaming={false} />);

    expect(screen.queryByText(/tokens\/s/)).not.toBeInTheDocument();
  });

  it("トークン数が推定のときは、「約」を付ける", () => {
    render(
      <AssistantMessage
        message={reply({ stats: { ...stats, estimated: true } })}
        streaming={false}
      />,
    );

    expect(screen.getByText("約 30.0 tokens/s")).toBeInTheDocument();
  });
});
