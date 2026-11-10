import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown", () => {
  it("見出し・強調・リスト・表を描く", () => {
    const { container } = render(
      <Markdown>{`# 見出し

**太字**と*斜体*

- 一つ目
- 二つ目

| 名前 | 値 |
| --- | --- |
| a | 1 |
`}</Markdown>,
    );

    expect(
      screen.getByRole("heading", { name: "見出し", level: 1 }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-streamdown="strong"]'),
    ).toHaveTextContent("太字");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("日本語の太字も崩れない", () => {
    const { container } = render(
      <Markdown>{"これは**「重要」**です。"}</Markdown>,
    );

    expect(
      container.querySelector('[data-streamdown="strong"]'),
    ).toHaveTextContent("「重要」");
  });

  it("コードブロックを描き、コピーできる", async () => {
    render(<Markdown>{"```ts\nconst a = 1;\n```"}</Markdown>);

    await waitFor(() => expect(screen.getByText(/const/)).toBeInTheDocument());
    expect(
      screen.getByRole("button", { name: "コードをコピー" }),
    ).toBeInTheDocument();
    // 画面からは保存できないので、ダウンロードは出さない
    expect(
      screen.queryByTitle(/ダウンロード|Download/i),
    ).not.toBeInTheDocument();
  });

  it("数式を描く", async () => {
    const { container } = render(<Markdown>{"面積は $x^2$ です。"}</Markdown>);

    await waitFor(() =>
      expect(container.querySelector(".katex")).toBeInTheDocument(),
    );
  });

  describe("独自タグ callout", () => {
    it("種類と題名を持つ部品として描き、中のMarkdownも解釈する", () => {
      render(
        <Markdown>{`<callout type="warning" title="削除に注意">

この操作は**元に戻せません**。

</callout>`}</Markdown>,
      );

      const callout = screen.getByLabelText("削除に注意");
      expect(callout.tagName).toBe("ASIDE");
      expect(callout).toHaveAttribute("data-slot", "callout");
      expect(
        callout.querySelector('[data-streamdown="strong"]'),
      ).toHaveTextContent("元に戻せません");
      expect(callout).toHaveTextContent("削除に注意");
    });

    it("題名が無ければ種類の名前を使い、種類が不明なら補足になる", () => {
      render(
        <>
          <Markdown>{`<callout type="tip">

早めに保存しましょう。

</callout>`}</Markdown>
          <Markdown>{`<callout type="unknown">

その他

</callout>`}</Markdown>
        </>,
      );

      expect(screen.getByLabelText("ヒント")).toHaveTextContent(
        "早めに保存しましょう。",
      );
      expect(screen.getByLabelText("補足")).toHaveTextContent("その他");
    });

    it("許可していない属性は取り除く", () => {
      render(
        <Markdown>{`<callout type="note" onclick="alert(1)" style="color:red">

本文

</callout>`}</Markdown>,
      );

      const callout = screen.getByLabelText("補足");
      expect(callout).not.toHaveAttribute("onclick");
      expect(callout).not.toHaveAttribute("style");
    });

    it("許可していないタグは、部品にならない", () => {
      const { container } = render(
        <Markdown>{`<script>alert(1)</script>

<iframe src="https://example.com"></iframe>`}</Markdown>,
      );

      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("iframe")).toBeNull();
    });
  });

  describe("外部への接続", () => {
    it("リンクは移動せず、URLをホバーで見せる", () => {
      const { container } = render(
        <Markdown>{"[公式](https://example.com/docs)"}</Markdown>,
      );

      expect(container.querySelector("a")).toBeNull();
      const link = screen.getByText("公式");
      expect(link).toHaveAttribute("title", "https://example.com/docs");
    });

    it("外部の画像は読み込まず、代替テキストだけを出す", () => {
      const { container } = render(
        <Markdown>{"![ロゴ](https://example.com/logo.png)"}</Markdown>,
      );

      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByText("[画像: ロゴ]")).toBeInTheDocument();
    });
  });

  it("書きかけの記法を整えて描く(ストリーミング中)", () => {
    const { container } = render(
      <Markdown streaming>{"**太字の途中"}</Markdown>,
    );

    expect(
      container.querySelector('[data-streamdown="strong"]'),
    ).toHaveTextContent("太字の途中");
  });
});
