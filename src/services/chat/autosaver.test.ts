import type { ChatStatus, UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  type AutosaveRequest,
  ConversationAutosaver,
  type ObservableChat,
} from "./autosaver";

const user = (id: string, text: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});

const assistant = (id: string, text: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "text", text, state: "done" }],
});

function setup(initial: UIMessage[] = [], profileId?: string) {
  const listeners = new Set<() => void>();
  const chat = {
    messages: initial,
    status: "ready" as ChatStatus,
    "~registerMessagesCallback": (onChange: () => void) => {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
    "~registerStatusCallback": (onChange: () => void) => {
      listeners.add(onChange);
      return () => void listeners.delete(onChange);
    },
  } satisfies ObservableChat;
  const saves: AutosaveRequest[] = [];
  const autosaver = new ConversationAutosaver("c1", chat, {
    save: (request) => saves.push(request),
    getProfileId: () => profileId,
  });
  const update = (change: { messages?: UIMessage[]; status?: ChatStatus }) => {
    if (change.messages) chat.messages = change.messages;
    if (change.status) chat.status = change.status;
    for (const listener of [...listeners]) listener();
  };
  return { autosaver, saves, update };
}

describe("ConversationAutosaver", () => {
  it("送信した直後に保存し、生成中は保存しない", () => {
    const { saves, update } = setup([], "p1");

    update({ messages: [user("u1", "やあ")], status: "submitted" });
    expect(saves).toHaveLength(1);

    update({ status: "streaming" });
    update({ messages: [user("u1", "やあ"), assistant("a1", "は")] });
    update({ messages: [user("u1", "やあ"), assistant("a1", "はい")] });
    expect(saves).toHaveLength(1);
  });

  it("返答が終わったら保存し、新しい会話ではタイトルを頼む(1回だけ)", () => {
    const { saves, update } = setup([], "p1");
    update({ messages: [user("u1", "やあ")], status: "submitted" });
    update({ status: "streaming" });
    update({ messages: [user("u1", "やあ"), assistant("a1", "はい")] });

    update({ status: "ready" });
    expect(saves).toHaveLength(2);
    expect(saves[1].titleProfileId).toBe("p1");

    update({
      messages: [
        user("u1", "やあ"),
        assistant("a1", "はい"),
        user("u2", "もう一つ"),
      ],
    });
    expect(saves[2].titleProfileId).toBeUndefined();
  });

  it("返答が無い(失敗した)会話では、タイトルを頼まない", () => {
    const { saves, update } = setup([], "p1");
    update({ messages: [user("u1", "やあ")], status: "submitted" });

    update({ status: "error" });

    expect(saves.every((save) => save.titleProfileId === undefined)).toBe(true);
  });

  it("開いただけの会話は保存しない。開いた会話ではタイトルも頼まない", () => {
    const opened = [user("u1", "前"), assistant("a1", "返答")];
    const { autosaver, saves, update } = setup(opened, "p1");

    update({ status: "ready" });
    autosaver.dispose({ save: true });
    expect(saves).toHaveLength(0);

    const next = setup(opened, "p1");
    next.update({
      messages: [...opened, user("u2", "続き"), assistant("a2", "答え")],
      status: "ready",
    });
    expect(next.saves[0].titleProfileId).toBeUndefined();
  });

  it("手放すとき、`save` が真なら未保存の分を保存する(タイトルは頼まない)", () => {
    const { autosaver, saves, update } = setup([], "p1");
    update({ messages: [user("u1", "やあ")], status: "streaming" });
    expect(saves).toHaveLength(0);

    autosaver.dispose({ save: true });

    expect(saves).toHaveLength(1);
    expect(saves[0].titleProfileId).toBeUndefined();
  });

  it("手放したあとは、状態が変わっても保存しない", () => {
    const { autosaver, saves, update } = setup([], "p1");

    autosaver.dispose({ save: false });
    update({ messages: [user("u1", "やあ")], status: "submitted" });

    expect(saves).toHaveLength(0);
  });

  it("接続先が無いときは、保存はするがタイトルは頼まない", () => {
    const { saves, update } = setup([]);
    update({
      messages: [user("u1", "やあ"), assistant("a1", "はい")],
      status: "ready",
    });

    expect(saves).toHaveLength(1);
    expect(saves[0].titleProfileId).toBeUndefined();
  });
});
