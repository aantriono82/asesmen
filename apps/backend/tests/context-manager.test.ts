import { describe, expect, it } from "vitest";
import { ContextManager } from "../src/application/chat/context-manager";

describe("context manager", () => {
  it("counts tokens across messages", async () => {
    const manager = new ContextManager({ demo: 100 });
    const total = await manager.countMessagesTokens(
      [
        { role: "system", content: "instruksi" },
        { role: "user", content: "buat soal" }
      ],
      async (text) => text.length
    );

    expect(total).toBe("instruksi".length + "buat soal".length + 16);
  });

  it("truncates oldest messages while preserving system prompt", async () => {
    const manager = new ContextManager({ demo: 52 });
    const result = await manager.truncate(
      "demo",
      [
        { role: "system", content: "system" },
        { role: "user", content: "1111111111" },
        { role: "assistant", content: "2222222222" },
        { role: "user", content: "3333333333" }
      ],
      async (text) => text.length,
      20
    );

    expect(result.messages[0]?.role).toBe("system");
    expect(result.messages.some((message) => message.content === "1111111111")).toBe(false);
    expect(result.messages.at(-1)?.content).toBe("3333333333");
  });
});
