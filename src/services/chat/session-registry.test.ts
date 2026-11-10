import type { ChatStatus, UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import type { AutosaveRequest } from "./autosaver";
import { ChatSessionRegistry, type ManagedChat } from "./session-registry";

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

/** `Chat` の代わり。状態を直接動かして、通知を飛ばす。 */
class FakeChat implements ManagedChat {
  messages: UIMessage[];
  status: ChatStatus = "ready";
  readonly dispose = vi.fn().mockResolvedValue(undefined);
  private readonly listeners = new Set<() => void>();

  constructor(messages: UIMessage[] = []) {
    this.messages = messages;
  }

  "~registerMessagesCallback" = (onChange: () => void) => {
    this.listeners.add(onChange);
    return () => void this.listeners.delete(onChange);
  };
  "~registerStatusCallback" = (onChange: () => void) => {
    this.listeners.add(onChange);
    return () => void this.listeners.delete(onChange);
  };

  update(change: { messages?: UIMessage[]; status?: ChatStatus }) {
    if (change.messages) this.messages = change.messages;
    if (change.status) this.status = change.status;
    for (const listener of [...this.listeners]) listener();
  }
}

function setup(profileId: string | undefined = "default") {
  const chats = new Map<string, FakeChat>();
  const saves: AutosaveRequest[] = [];
  const registry = new ChatSessionRegistry<FakeChat>({
    createChat: ({ id, messages }) => {
      const chat = new FakeChat(messages);
      chats.set(id, chat);
      return chat;
    },
    deps: {
      save: (request) => saves.push(request),
      getProfileId: () => profileId,
    },
  });
  return { registry, chats, saves };
}

describe("ChatSessionRegistry", () => {
  it("同じ会話は何度借りても同じものが返る(再描画で作り直さない)", () => {
    const { registry } = setup();

    const first = registry.acquire("a", [user("u1", "やあ")]);
    const second = registry.acquire("a");

    expect(second).toBe(first);
    expect(registry.has("a")).toBe(true);
  });

  it("別の会話に切り替えても、生成中の会話は手放さず、止めない", () => {
    const { registry, chats } = setup();
    const a = registry.acquire("a");
    a.update({ messages: [user("u1", "長い質問")], status: "streaming" });
    registry.acquire("b");

    registry.prune("b");

    expect(registry.has("a")).toBe(true);
    expect(chats.get("a")?.dispose).not.toHaveBeenCalled();
  });

  it("切り替えると、生成中でない会話は手放し、未保存の分を保存する", () => {
    const { registry, chats, saves } = setup();
    const a = registry.acquire("a", [
      user("u1", "やあ"),
      assistant("a1", "はい"),
    ]);
    // 生成が終わったあと、保存の前に状態だけ変わった(ことにする)
    a.messages = [...a.messages, user("u2", "もう一つ")];
    registry.acquire("b");

    registry.prune("b");

    expect(registry.has("a")).toBe(false);
    expect(chats.get("a")?.dispose).toHaveBeenCalled();
    expect(saves).toHaveLength(1);
    expect(saves[0].id).toBe("a");
    expect(saves[0].messages).toHaveLength(3);
  });

  it("画面から外れたあとに生成が終わっても、保存する", () => {
    const { registry, saves } = setup();
    const a = registry.acquire("a");
    a.update({ messages: [user("u1", "質問")], status: "submitted" });
    a.update({ status: "streaming" });
    registry.acquire("b");
    registry.prune("b");
    saves.length = 0;

    // 画面は無くても、生成は進む
    a.update({ messages: [user("u1", "質問"), assistant("a1", "答え")] });
    a.update({ status: "ready" });

    expect(saves).toHaveLength(1);
    expect(saves[0]).toMatchObject({ id: "a", titleProfileId: "default" });
    expect(saves[0].messages).toHaveLength(2);
  });

  it("開いただけの会話は、手放しても保存しない", () => {
    const { registry, saves } = setup();
    registry.acquire("a", [
      user("u1", "前の発言"),
      assistant("a1", "前の返答"),
    ]);

    registry.prune("b");

    expect(registry.has("a")).toBe(false);
    expect(saves).toHaveLength(0);
  });

  it("削除では、生成を止め、保存はしない(削除したファイルを書き戻さない)", async () => {
    const { registry, chats, saves } = setup();
    const a = registry.acquire("a");
    a.update({ messages: [user("u1", "質問")], status: "streaming" });
    saves.length = 0;

    await registry.dispose("a");
    // 止めたあとの状態の変化は、もう保存されない
    a.update({
      messages: [user("u1", "質問"), assistant("a1", "途中")],
      status: "ready",
    });

    expect(chats.get("a")?.dispose).toHaveBeenCalled();
    expect(registry.has("a")).toBe(false);
    expect(saves).toHaveLength(0);
  });

  it("無い会話を削除しても何も起きない", async () => {
    const { registry } = setup();

    await expect(registry.dispose("none")).resolves.toBeUndefined();
  });
});
